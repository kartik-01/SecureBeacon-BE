import { Response } from 'express';
import { AnalysisModel, AnalysisDocument, InputType, MLResult } from '../models/Analysis';
import { getMLResult } from '../services/mlService';
import { AuthRequest } from '../middleware/auth';

type CreateAnalysisBody = {
  inputType?: InputType;
  inputContent?: string;
  analysisContext?: Record<string, unknown>;
  mlResult?: MLResult;
};

function serializeAnalysis(doc: AnalysisDocument) {
  return {
    id: doc.id,
    userSub: doc.userSub,
    userEmail: doc.userEmail,
    inputType: doc.inputType,
    inputContent: doc.inputContent,
    analysisContext: doc.analysisContext ?? null,
    mlResult: doc.mlResult,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createAnalysis(req: AuthRequest, res: Response) {
  const userSub = typeof req.auth?.sub === 'string' ? (req.auth?.sub as string) : null;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  // Get email from request body (sent by frontend)
  const userEmailRaw = typeof req.body?.userEmail === 'string' ? req.body.userEmail : '';

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const userEmail = userEmailRaw && emailRegex.test(userEmailRaw)
    ? userEmailRaw
    : `${userSub.replace(/\W+/g, '_')}@securebeacon.app`;

  const { inputType, inputContent, analysisContext, mlResult: providedMlResult } = req.body as CreateAnalysisBody;

  if (!inputType || !['url', 'header', 'eml'].includes(inputType)) {
    return res.status(400).json({ message: 'inputType must be one of url, header, eml' });
  }

  if (!inputContent || typeof inputContent !== 'string' || inputContent.trim().length === 0) {
    return res.status(400).json({ message: 'inputContent is required' });
  }

  try {
    // Use provided ML result if available, otherwise call ML service
    const mlResult = providedMlResult && 
      typeof providedMlResult.is_phishing === 'boolean' && 
      typeof providedMlResult.phishing_probability === 'number'
      ? providedMlResult
      : await getMLResult(inputType, inputContent);
    const normalizedContext =
      analysisContext && typeof analysisContext === 'object' && !Array.isArray(analysisContext)
        ? analysisContext
        : undefined;

    const record = await AnalysisModel.create({
      userSub,
      userEmail,
      inputType,
      inputContent,
      analysisContext: normalizedContext,
      mlResult,
    });

    return res.status(201).json(serializeAnalysis(record));
  } catch (error) {
    console.error('[createAnalysis] error', error);
    return res.status(502).json({ message: 'Failed to generate analysis' });
  }
}

export async function getAnalyses(req: AuthRequest, res: Response) {
  const userSub = req.auth?.sub;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const filter: Record<string, unknown> = { userSub };

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      filter.createdAt = { $lt: cursorDate };
    }
  }

  const records = await AnalysisModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .exec();

  let nextCursor: string | null = null;

  if (records.length > limit) {
    const last = records.pop()!;
    nextCursor = last.createdAt.toISOString();
  }

  return res.json({
    items: records.map(serializeAnalysis),
    nextCursor,
  });
}

export async function getAnalysisById(req: AuthRequest, res: Response) {
  const userSub = req.auth?.sub;
  if (!userSub) {
    return res.status(401).json({ message: 'User authentication required' });
  }

  const { analysisId } = req.params;

  const record = await AnalysisModel.findOne({ _id: analysisId, userSub }).exec();
  if (!record) {
    return res.status(404).json({ message: 'Analysis not found' });
  }

  return res.json(serializeAnalysis(record));
}


