import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  sessionId: mongoose.Types.ObjectId;
  age: number | null;
  investmentAmount: number | null;
  horizonYears: number | null;
  riskCapacity: 'low' | 'medium' | 'high' | null;
  goal: string | null;
  // Conversation state fields — used to derive riskCapacity
  incomeStability: 'stable' | 'unstable' | null;
  riskReaction: string | null;
}

const UserProfileSchema: Schema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'ConversationSession', required: true, unique: true },
  age: { type: Number, default: null },
  investmentAmount: { type: Number, default: null },
  horizonYears: { type: Number, default: null },
  riskCapacity: { type: String, enum: ['low', 'medium', 'high', null], default: null },
  goal: { type: String, default: null },
  // Additional fields from ConversationState (Section 7)
  // These are intermediate fields used to derive riskCapacity
  incomeStability: { type: String, enum: ['stable', 'unstable', null], default: null },
  riskReaction: { type: String, default: null },
});

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
