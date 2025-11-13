import { Schema, model, Document } from 'mongoose';

export type InputType = 'url' | 'header' | 'eml';

export interface MLResult {
  is_phishing: boolean;
  phishing_probability: number;
}

export interface AnalysisDocument extends Document {
  userSub: string;
  userEmail: string;
  inputType: InputType;
  inputContent: string;
  analysisContext?: Record<string, unknown>;
  mlResult: MLResult;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<AnalysisDocument>(
  {
    userSub: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    inputType: {
      type: String,
      required: true,
      enum: ['url', 'header', 'eml'],
    },
    inputContent: { type: String, required: true },
    analysisContext: { type: Schema.Types.Mixed },
    mlResult: {
      is_phishing: { type: Boolean, required: true },
      phishing_probability: { type: Number, required: true },
    },
  },
  {
    timestamps: true,
    collection: 'records',
  }
);

AnalysisSchema.index({ userSub: 1, createdAt: -1 });

export const AnalysisModel = model<AnalysisDocument>('Analysis', AnalysisSchema);


