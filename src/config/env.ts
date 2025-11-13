import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}


export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: requireEnv('MONGODB_URI'),
  auth0Domain: requireEnv('AUTH0_DOMAIN'),
  auth0Audience: requireEnv('AUTH0_AUDIENCE'),
  mlApiUrl: requireEnv('ML_API_URL'),
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
};


