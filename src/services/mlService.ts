import axios from 'axios';
import { env } from '../config/env';
import { InputType, MLResult } from '../models/Analysis';

export async function getMLResult(inputType: InputType, inputContent: string): Promise<MLResult> {
  // Only email analysis is supported
  if (inputType !== 'header' && inputType !== 'eml') {
    throw new Error('Only email header analysis is supported');
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


