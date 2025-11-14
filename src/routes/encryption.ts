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

export default router;

