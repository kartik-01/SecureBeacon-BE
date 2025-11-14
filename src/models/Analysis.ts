import { Schema, model, Document } from 'mongoose';

export type InputType = 'url' | 'header' | 'eml';

export interface MLResult {
  is_phishing: boolean;
  phishing_probability: number;
}

export interface AnalysisDocument extends Document {
  userSub: string;
  userEmail: string; // Can be encrypted JSON string or plain string
  inputType: InputType;
  inputContent: string; // Can be encrypted JSON string or plain string
  analysisContext?: string | Record<string, unknown>; // Can be encrypted JSON string or object
  mlResult: string | MLResult; // Can be encrypted JSON string or object
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
    analysisContext: { type: Schema.Types.Mixed }, // Can store string or object
    mlResult: { type: Schema.Types.Mixed, required: true }, // Can store encrypted JSON string or object
  },
  {
    timestamps: true,
    collection: 'records',
  }
);

AnalysisSchema.index({ userSub: 1, createdAt: -1 });

export const AnalysisModel = model<AnalysisDocument>('Analysis', AnalysisSchema);


