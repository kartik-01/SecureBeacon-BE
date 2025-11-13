import { Router } from 'express';
import { createAnalysis, getAnalyses, getAnalysisById } from '../controllers/analysisController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', createAnalysis);
router.get('/', getAnalyses);
router.get('/:analysisId', getAnalysisById);

export default router;


