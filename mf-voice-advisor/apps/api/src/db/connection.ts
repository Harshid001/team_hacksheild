/**
 * MongoDB connection — Mongoose setup.
 * Reads MONGODB_URI from .env (dotenv loaded in index.ts before this is called).
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mf_voice_advisor';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✓ MongoDB connected: ${MONGODB_URI}`);
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    throw error;
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠ MongoDB disconnected');
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected gracefully');
}
