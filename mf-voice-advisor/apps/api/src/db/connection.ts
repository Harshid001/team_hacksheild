/**
 * MongoDB connection — Mongoose setup with serverless-safe caching.
 * Reuses a single connection across Vercel serverless invocations.
 */

import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const DEFAULT_URI = 'mongodb+srv://harshidsoni01_db_user:F3u2KYcb8w5evnnc@cluster0.vjjrlkm.mongodb.net/mf_voice_advisor?appName=Cluster0';

function maskMongoUri(uri: string): string {
  if (!uri) return '(undefined)';
  try {
    const url = new URL(uri);
    if (url.username) url.username = '***';
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '(set, invalid format)';
  }
}

if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}

const cached = global.mongooseCache;

function isConnectionReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function resetCache(): void {
  cached.conn = null;
  cached.promise = null;
}

export async function connectDB(): Promise<typeof mongoose> {
  const mongoUri = process.env.MONGODB_URI || DEFAULT_URI;
  console.log(`[MongoDB] connectDB — URI: ${maskMongoUri(mongoUri)}`);

  // Reuse only a live connection — stale cached.conn after cold start causes query buffering timeouts.
  if (cached.conn && isConnectionReady()) {
    return cached.conn;
  }

  if (cached.conn && !isConnectionReady()) {
    console.warn('[MongoDB] Cached connection is stale — reconnecting');
    resetCache();
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => {
        console.log(`✓ MongoDB connected: ${maskMongoUri(mongoUri)}`);

        mongooseInstance.connection.on('error', (err) => {
          console.error('MongoDB runtime error:', err);
          resetCache();
        });

        mongooseInstance.connection.on('disconnected', () => {
          console.warn('⚠ MongoDB disconnected');
          resetCache();
        });

        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    resetCache();
    console.error('✗ MongoDB connection failed:', error);
    throw error;
  }

  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    resetCache();
    console.log('MongoDB disconnected gracefully');
  }
}
