import { Router } from 'express';
import { createAnalysis } from '../controllers/analysisController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.post('/', createAnalysis);

export default router;

