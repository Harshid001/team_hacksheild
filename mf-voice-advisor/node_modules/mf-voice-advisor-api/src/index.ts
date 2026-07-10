/**
 * index.ts — Express + Socket.io server entry point
 *
 * Wires together:
 *   - MongoDB connection
 *   - CORS + JSON body parser
 *   - REST routes: /api/conversation, /api/report, /api/analytics
 *   - WebSocket via Socket.io
 *   - Health check endpoint
 *   - Ollama health check on startup
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import { connectDB } from './db/connection';
import conversationRoutes from './routes/conversation.route';
import reportRoutes from './routes/report.route';
import analyticsRoutes from './routes/analytics.route';
import { setupConversationSockets } from './sockets/conversation.socket';
import { checkOllamaHealth } from './services/ollama.service';
import { checkAnalyticsHealth } from './services/analyticsClient.service';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for audio blobs

// ---------------------------------------------------------------------------
// REST Routes
// ---------------------------------------------------------------------------

app.use('/api/conversation', conversationRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', async (req: Request, res: Response) => {
  const ollamaHealth = await checkOllamaHealth();
  const analyticsHealth = await checkAnalyticsHealth();

  res.json({
    status: 'ok',
    service: 'mf-voice-advisor-api',
    ollama: ollamaHealth,
    analytics: analyticsHealth,
    env: {
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen3:4b',
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000',
      MONGODB_URI: process.env.MONGODB_URI ? '(set)' : '(default: localhost)',
    },
  });
});

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

setupConversationSockets(io);

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Check Ollama availability (non-blocking — just log)
    const ollamaStatus = await checkOllamaHealth();
    if (ollamaStatus.ok) {
      console.log(`✓ Ollama is running — model: ${ollamaStatus.model}`);
    } else {
      console.warn(`⚠ Ollama check failed: ${ollamaStatus.error}`);
      console.warn('  The server will start, but conversation/report generation will fail.');
      console.warn(`  Make sure Ollama is running: ollama serve`);
      console.warn(`  And the model is pulled: ollama pull ${ollamaStatus.model}`);
    }

    // 3. Check Analytics Service availability (non-blocking — just log)
    const analyticsStatus = await checkAnalyticsHealth();
    if (analyticsStatus.ok) {
      console.log('✓ Analytics service is running');
    } else {
      console.warn(`⚠ Analytics service check failed: ${analyticsStatus.error}`);
      console.warn('  Report generation may fail if no cached metrics exist in MongoDB.');
    }

    // 4. Start the HTTP + WebSocket server
    server.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`  MF Voice Advisor API — listening on port ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
      console.log(`${'='.repeat(60)}\n`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});

start();
