import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  sessionId: mongoose.Types.ObjectId;
  recommendedCategory: string;
  narrativeText: string;
  metricsUsed: mongoose.Schema.Types.Mixed;
  createdAt: Date;
}

const ReportSchema: Schema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'ConversationSession', required: true, unique: true },
  recommendedCategory: { type: String, required: true },
  narrativeText: { type: String, required: true },
  metricsUsed: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Report = mongoose.model<IReport>('Report', ReportSchema);
