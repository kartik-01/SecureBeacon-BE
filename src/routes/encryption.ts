import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { UserSaltModel } from '../models/UserSalt';
import { AnalysisModel } from '../models/Analysis';

const router = Router();

// Get encryption status (hasSalt, hasAnalyses)
router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  try {
    // Check if salt exists
    const userSalt = await UserSaltModel.findOne({ userSub });
    const hasSalt = !!userSalt;

    // Check if user has any analyses (efficient check with findOne)
    const analysis = await AnalysisModel.findOne({ userSub }).lean();
    const hasAnalyses = !!analysis;

    return res.json({
      hasSalt,
      hasAnalyses,
      salt: hasSalt ? userSalt!.salt : null,
    });
  } catch (error) {
    console.error('[getEncryptionStatus] error', error);
    return res.status(500).json({ message: 'Failed to retrieve encryption status' });
  }
});

// Get user's salt
router.get('/salt', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  try {
    const userSalt = await UserSaltModel.findOne({ userSub });
    if (!userSalt) {
      return res.status(404).json({ message: 'Salt not found' });
    }

    return res.json({ salt: userSalt.salt });
  } catch (error) {
    console.error('[getSalt] error', error);
    return res.status(500).json({ message: 'Failed to retrieve salt' });
  }
});

// Save user's salt
router.post('/salt', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  const { salt } = req.body;
  if (!salt || typeof salt !== 'string') {
    return res.status(400).json({ message: 'Salt is required' });
  }

  try {
    await UserSaltModel.findOneAndUpdate(
      { userSub },
      { salt },
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: 'Salt saved successfully' });
  } catch (error) {
    console.error('[saveSalt] error', error);
    return res.status(500).json({ message: 'Failed to save salt' });
  }
});

// Get current unlock rate limit status for user
router.get('/unlock-status', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  try {
    const userSalt = await UserSaltModel.findOne({ userSub });
    const now = Date.now();

    if (userSalt && userSalt.lockedUntil > 0 && now < userSalt.lockedUntil) {
      // Still locked
      return res.json({
        isLocked: true,
        lockedUntil: userSalt.lockedUntil,
        remainingSeconds: Math.ceil((userSalt.lockedUntil - now) / 1000),
        attempts: userSalt.unlockAttempts,
      });
    } else if (userSalt && userSalt.lockedUntil > 0 && now >= userSalt.lockedUntil) {
      // Lockout expired, clear it
      await UserSaltModel.findOneAndUpdate(
        { userSub },
        { unlockAttempts: 0, lockedUntil: 0 }
      );
    }

    // Check if user has failed attempts (not locked yet)
    return res.json({
      isLocked: false,
      lockedUntil: null,
      remainingSeconds: 0,
      attempts: userSalt?.unlockAttempts || 0,
    });
  } catch (error) {
    console.error('[getUnlockStatus] error', error);
    return res.status(500).json({ message: 'Failed to retrieve unlock status' });
  }
});

// Lock user for failed unlock attempts (called by frontend)
router.post('/lock-user', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  const { lockedUntil, attempts } = req.body;
  if (typeof lockedUntil !== 'number' || typeof attempts !== 'number') {
    return res.status(400).json({ message: 'Invalid lockout parameters' });
  }

  try {
    await UserSaltModel.findOneAndUpdate(
      { userSub },
      { unlockAttempts: attempts, lockedUntil },
      { upsert: true, new: true }
    );

    return res.json({
      message: 'User locked',
      lockedUntil,
      remainingSeconds: Math.ceil((lockedUntil - Date.now()) / 1000),
    });
  } catch (error) {
    console.error('[lockUser] error', error);
    return res.status(500).json({ message: 'Failed to lock user' });
  }
});

// Clear user's rate limit lock (admin/manual reset or after lockout expires)
router.post('/unlock-user', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  try {
    await UserSaltModel.findOneAndUpdate(
      { userSub },
      { unlockAttempts: 0, lockedUntil: 0 },
      { upsert: true, new: true }
    );
    return res.json({ message: 'User unlocked' });
  } catch (error) {
    console.error('[unlockUser] error', error);
    return res.status(500).json({ message: 'Failed to unlock user' });
  }
});

// Save failed unlock attempts (before lockout)
router.post('/save-attempts', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  const { attempts } = req.body;
  if (typeof attempts !== 'number' || attempts < 0 || attempts > 5) {
    return res.status(400).json({ message: 'Invalid attempts value' });
  }

  try {
    // Store attempts in database (not locked, just tracking)
    await UserSaltModel.findOneAndUpdate(
      { userSub },
      { unlockAttempts: attempts, lockedUntil: 0 },
      { upsert: true, new: true }
    );

    return res.json({ message: 'Attempts saved', attempts });
  } catch (error) {
    console.error('[saveAttempts] error', error);
    return res.status(500).json({ message: 'Failed to save attempts' });
  }
});

// Get current unlock attempts (for recovery)
router.get('/unlock-attempts', requireAuth, async (req: AuthRequest, res: Response) => {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  try {
    const userSalt = await UserSaltModel.findOne({ userSub });
    return res.json({
      attempts: userSalt?.unlockAttempts || 0,
      lockedUntil: userSalt?.lockedUntil || 0,
    });
  } catch (error) {
    console.error('[getUnlockAttempts] error', error);
    return res.status(500).json({ message: 'Failed to get attempts' });
  }
});

export default router;

