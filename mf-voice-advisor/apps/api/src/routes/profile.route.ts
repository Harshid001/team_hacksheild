import { Router, Request, Response } from 'express';
import { requireAuth as authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { FinancialProfile } from '../db/models/FinancialProfile';

const router = Router();

// GET /api/profile
// Fetch the authenticated user's financial profile
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let profile = await FinancialProfile.findOne({ userId });
    
    // If no profile exists yet, create an empty one
    if (!profile) {
      profile = await FinancialProfile.create({ userId });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile
// Update the user's financial profile
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updates = req.body; // ageGroup, timeHorizon, monthlyInvestment, targetGoal, riskTolerance

    let profile = await FinancialProfile.findOne({ userId });
    if (!profile) {
      profile = new FinancialProfile({ userId });
    }

    // Update fields
    if (updates.ageGroup) profile.ageGroup = updates.ageGroup;
    if (updates.timeHorizon) profile.timeHorizon = updates.timeHorizon;
    if (updates.monthlyInvestment) profile.monthlyInvestment = updates.monthlyInvestment;
    if (updates.targetGoal) profile.targetGoal = updates.targetGoal;
    if (updates.riskTolerance) profile.riskTolerance = updates.riskTolerance;

    await profile.save();

    res.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
