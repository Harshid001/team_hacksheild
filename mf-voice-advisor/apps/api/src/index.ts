/**
 * index.ts — Express server entry point
 *
 * Wires together:
 *   - MongoDB connection
 *   - CORS + JSON body parser
 *   - REST routes: /api/chat, /api/report, /api/analytics
 *   - Health check endpoint
 *   - Ollama health check on startup
 *
 * NOTE: WebSocket (Socket.io) removed — SSE handles streaming now.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';

import { connectDB } from './db/connection';
import authRoutes from './routes/auth.route';
import profileRoutes from './routes/profile.route';
import chatRoutes from './routes/chat.route';
import reportRoutes from './routes/report.route';
import analyticsRoutes from './routes/analytics.route';
import { checkOllamaHealth } from './services/ollama.service';
import { checkAnalyticsHealth } from './services/analyticsClient.service';

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('team-hacksheild') || origin.includes('mf-advisor') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for audio blobs
app.use(cookieParser());

// Ensure MongoDB is connected before any route handler runs (required on Vercel
// where start() is skipped and each cold start must establish/reuse a connection).
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection middleware error:', error);
    const requestPath = req.originalUrl || req.path;
    if (requestPath.includes('/auth/google/callback')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/signup?error=DatabaseUnavailable`);
    }
    res.status(503).json({ error: 'Database connection unavailable' });
  }
});

// ---------------------------------------------------------------------------
// REST Routes
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', async (req: Request, res: Response) => {
  const ollamaHealth = await checkOllamaHealth();
  const analyticsHealth = await checkAnalyticsHealth();

  res.json({
    status: 'ok',
    service: 'mf-voice-advisor-api',
    ollama: ollamaHealth,
    analytics: analyticsHealth,
    env: {
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen3:4b',
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      OLLAMA_API_KEY: process.env.OLLAMA_API_KEY ? '(set)' : '(default: ollama)',
      ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000',
      MONGODB_URI: process.env.MONGODB_URI ? '(set)' : '(default: localhost)',
    },
  });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Check Ollama availability (non-blocking — just log)
    const ollamaStatus = await checkOllamaHealth();
    if (ollamaStatus.ok) {
      console.log(`✓ Ollama is running — model: ${ollamaStatus.model}`);
    } else {
      console.warn(`⚠ Ollama check failed: ${ollamaStatus.error}`);
      console.warn('  The server will start, but chat and report generation will fail.');
      console.warn(`  Make sure Ollama is running: ollama serve`);
      console.warn(`  And the model is pulled: ollama pull ${ollamaStatus.model}`);
    }

    // 3. Check Analytics Service availability (non-blocking — just log)
    const analyticsStatus = await checkAnalyticsHealth();
    if (analyticsStatus.ok) {
      console.log('✓ Analytics service is running');
    } else {
      console.warn(`⚠ Analytics service check failed: ${analyticsStatus.error}`);
      console.warn('  Report generation may fail if no cached metrics exist in MongoDB.');
    }

    // 4. Start the HTTP server (with retry on EADDRINUSE for tsx watch hot-reload)
    await new Promise<void>((resolve, reject) => {
      server.listen(PORT, () => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  MF Voice Advisor API — listening on port ${PORT}`);
        console.log(`  Health check: http://localhost:${PORT}/health`);
        console.log(`  Chat endpoint: POST http://localhost:${PORT}/api/chat/start`);
        console.log(`${'='.repeat(60)}\n`);
        resolve();
      });

      server.on('error', async (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠ Port ${PORT} in use — waiting 2s then retrying (tsx watch reload)...`);
          server.close();
          await new Promise(r => setTimeout(r, 2000));
          server.listen(PORT);
        } else {
          reject(err);
        }
      });
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});

if (process.env.VERCEL !== '1') {
  start();
}

export default app;
