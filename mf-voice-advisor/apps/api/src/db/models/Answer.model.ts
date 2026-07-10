import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer extends Document {
  sessionId: mongoose.Types.ObjectId;
  question: string;
  answerText: string;
  fieldTargeted: string;
  createdAt: Date;
}

const AnswerSchema: Schema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'ConversationSession', required: true },
  question: { type: String, required: true },
  answerText: { type: String, required: true },
  fieldTargeted: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);
