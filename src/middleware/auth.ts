import { Request } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { env } from '../config/env';

const jwksUri = `https://${env.auth0Domain}/.well-known/jwks.json`;

const getKey: GetVerificationKey = jwksRsa.expressJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri,
});

export const requireAuth = expressjwt({
  secret: getKey,
  audience: env.auth0Audience,
  issuer: `https://${env.auth0Domain}/`,
  algorithms: ['RS256'],
  requestProperty: 'auth',
  credentialsRequired: true,
});

export type AuthRequest = Request & {
  auth?: {
    sub?: string;
    [key: string]: unknown;
  };
};


