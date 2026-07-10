import mongoose, { Schema, Document } from 'mongoose';

export interface IToolCall {
  name: string;
  args: Record<string, any>;
  result?: any;
}

export interface IChatMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: IToolCall[];
  createdAt: Date;
}

const ToolCallSchema = new Schema({
  name: { type: String, required: true },
  args: { type: Schema.Types.Mixed, default: {} },
  result: { type: Schema.Types.Mixed, default: null },
}, { _id: false });

const ChatMessageSchema: Schema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'ConversationSession', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, default: '' },
  toolCalls: { type: [ToolCallSchema], default: undefined },
  createdAt: { type: Date, default: Date.now },
});

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
