import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

export async function connectToDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(env.mongoUri, {
    dbName: process.env.MONGODB_DB_NAME ?? 'securebeacon',
  });
}


