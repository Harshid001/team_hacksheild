import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '../db/connection';
import { User } from '../db/models/User';
import { RefreshToken } from '../db/models/RefreshToken';
import { FinancialProfile } from '../db/models/FinancialProfile';
import { requireAuth as authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_access';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecret_refresh';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Helper to generate access token
const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

// Helper to generate refresh token
const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });
};

// Cookie config
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Must be lax for cross-site redirect callbacks
  maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
};

// Helper to get dynamic base URLs from the request
const getUrls = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const backendUrl = process.env.BACKEND_URL || `${proto}://${host}`;
  const frontendUrl = process.env.FRONTEND_URL || backendUrl;
  const redirectUri = `${backendUrl}/api/auth/google/callback`;
  return { backendUrl, frontendUrl, redirectUri };
};

// GET /api/auth/google
router.get('/google', (req: Request, res: Response) => {
  const { redirectUri } = getUrls(req);
  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req: Request, res: Response): Promise<any> => {
  const { frontendUrl, redirectUri } = getUrls(req);
  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
  try {
    await connectDB();

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.redirect(`${frontendUrl}/signup?error=MissingCode`);
    }

    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${frontendUrl}/signup?error=InvalidGoogleToken`);
    }

    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: name || 'Google User',
        email: email.toLowerCase(),
        authProvider: 'google',
        googleId,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      await user.save();
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    res.cookie('refreshToken', refreshToken, cookieOptions);
    
    // Redirect back to frontend token bridge
    res.redirect(`${frontendUrl}/oauth-callback?token=${accessToken}`);
  } catch (error: any) {
    console.error('Google Auth error:', error);
    const isDbError =
      error?.name === 'MongooseError' ||
      error?.message?.includes('MONGODB_URI') ||
      error?.message?.includes('buffering timed out') ||
      error?.message?.includes('connection');
    res.redirect(
      `${frontendUrl}/signup?error=${isDbError ? 'DatabaseUnavailable' : 'GoogleAuthFailed'}&details=${encodeURIComponent(error?.message || String(error))}`
    );
  }
});

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, passwordHash, authProvider: 'local' });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials or login with Google' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token in DB
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });
    
    const profile = await FinancialProfile.findOne({ userId: user.id });

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, hasProfile: !!profile?.isComplete } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Verify token exists in DB (not revoked)
    const tokenRecord = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    }

    if (tokenRecord.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: tokenRecord._id });
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Verify JWT signature
    try {
      jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      await RefreshToken.deleteOne({ _id: tokenRecord._id });
      return res.status(401).json({ error: 'Invalid refresh token signature' });
    }

    const accessToken = generateAccessToken(tokenRecord.userId.toString());
    res.json({ accessToken });
  } catch (error: any) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    res.clearCookie('refreshToken', { ...cookieOptions, maxAge: 0 });
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const profile = await FinancialProfile.findOne({ userId: user.id });

    res.json({ user: { id: user.id, name: user.name, email: user.email, hasProfile: !!profile?.isComplete } });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
