import { Schema, model, Document } from 'mongoose';

export interface UserSaltDocument extends Document {
  userSub: string;
  salt: string; // Base64 encoded salt
  unlockAttempts: number; // Failed unlock attempts
  lockedUntil: number; // Timestamp when lockout expires (0 if not locked)
  createdAt: Date;
  updatedAt: Date;
}

const UserSaltSchema = new Schema<UserSaltDocument>(
  {
    userSub: { type: String, required: true, unique: true, index: true },
    salt: { type: String, required: true },
    unlockAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'userSalts',
  }
);

export const UserSaltModel = model<UserSaltDocument>('UserSalt', UserSaltSchema);

