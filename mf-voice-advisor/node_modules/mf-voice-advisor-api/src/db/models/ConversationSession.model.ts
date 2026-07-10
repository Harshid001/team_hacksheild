import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationSession extends Document {
  status: 'in_progress' | 'completed';
  createdAt: Date;
}

const ConversationSessionSchema: Schema = new Schema({
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  createdAt: { type: Date, default: Date.now }
});

export const ConversationSession = mongoose.model<IConversationSession>('ConversationSession', ConversationSessionSchema);
