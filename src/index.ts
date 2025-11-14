import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { connectToDatabase } from './config/db';
import analysesRouter from './routes/analyses';
import saveResultsRouter from './routes/saveResults';
import encryptionRouter from './routes/encryption';

async function bootstrap() {
  await connectToDatabase();

  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS not allowed'), false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/analyses', analysesRouter);
  app.use('/api/saveResults', saveResultsRouter);
  app.use('/api/encryption', encryptionRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ message: 'Invalid or missing token' });
    }
    console.error('[Express] Unhandled error', err);
    return res.status(500).json({ message: 'Internal server error' });
  });

  app.listen(env.port, () => {
    console.log(`SecureBeacon backend listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});


