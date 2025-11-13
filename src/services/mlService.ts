import axios from 'axios';
import { env } from '../config/env';
import { InputType, MLResult } from '../models/Analysis';

const SAFE_DOMAINS = new Set([
  'google.com',
  'www.google.com',
  'gmail.com',
  'www.gmail.com',
  'facebook.com',
  'www.facebook.com',
  'instagram.com',
  'www.instagram.com',
  'apple.com',
  'www.apple.com',
  'microsoft.com',
  'www.microsoft.com',
  'amazon.com',
  'www.amazon.com',
  'linkedin.com',
  'www.linkedin.com',
  'youtube.com',
  'www.youtube.com',
  'twitter.com',
  'www.twitter.com',
  'netflix.com',
  'www.netflix.com',
]);

function analyzeUrlHeuristically(rawUrl: string): MLResult {
  try {
    const { hostname } = new URL(rawUrl);
    if (SAFE_DOMAINS.has(hostname.toLowerCase())) {
      return {
        is_phishing: false,
        phishing_probability: 0.05,
      };
    }
    return {
      is_phishing: true,
      phishing_probability: 0.95,
    };
  } catch {
    return {
      is_phishing: true,
      phishing_probability: 0.99,
    };
  }
}

export async function getMLResult(inputType: InputType, inputContent: string): Promise<MLResult> {
  if (inputType === 'url') {
    return analyzeUrlHeuristically(inputContent);
  }

  const response = await axios.post(
    `${env.mlApiUrl.replace(/\/$/, '')}/predict`,
    { raw_email: inputContent },
    {
      timeout: 10000,
    }
  );

  const data = response.data;

  if (typeof data?.is_phishing !== 'boolean' || typeof data?.phishing_probability !== 'number') {
    throw new Error('Unexpected ML API response format');
  }

  return {
    is_phishing: data.is_phishing,
    phishing_probability: data.phishing_probability,
  };
}


