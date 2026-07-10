/**
 * chat.route.ts — SSE streaming chat endpoints
 *
 * ALL assistant responses come from the Ollama LLM via streaming SSE.
 * The backend generates NO conversational text.
 *
 * Endpoints:
 *   POST /api/chat/start              → creates session, streams AI greeting via SSE
 *   POST /api/chat/:sessionId/message  → accepts user message, streams AI response via SSE
 *   GET  /api/chat/:sessionId/messages → returns full chat history (JSON)
 *   GET  /api/chat/:sessionId/profile  → returns current profile state (JSON)
 */

import { Router, Response } from 'express';
import { startChat, streamChatResponse, getMessages } from '../services/chat.service';
import { getProfileState } from '../services/profile.service';
import { ConversationSession } from '../db/models/ConversationSession.model';
import { requireAuth as authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/chat/start — create session + stream AI greeting
// ---------------------------------------------------------------------------

router.post('/start', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const { sessionId, stream } = await startChat(userId);

    // Send session ID first
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`);

    // Stream the greeting
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('POST /chat/start error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat/:sessionId/message — stream AI response to user message
// ---------------------------------------------------------------------------

router.post('/:sessionId/message', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const { sessionId } = req.params;
  const { message } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required and must be a string' });
    return;
  }

  // Verify session exists
  const session = await ConversationSession.findById(sessionId);
  if (!session) {
    res.status(404).json({ error: `Session ${sessionId} not found` });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // Stream the AI response
    for await (const chunk of streamChatResponse(sessionId as string, message, userId as string)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error(`POST /chat/${sessionId}/message error:`, error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat/:sessionId/messages — full chat history
// ---------------------------------------------------------------------------

router.get('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ConversationSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }

    const messages = await getMessages(sessionId);
    res.json({ sessionId, messages, status: session.status });
  } catch (error: any) {
    console.error(`GET /chat/:sessionId/messages error:`, error);
    res.status(500).json({ error: 'Failed to fetch messages', detail: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat/:sessionId/profile — current profile state
// ---------------------------------------------------------------------------

router.get('/:sessionId/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profileState = await getProfileState(userId);
    res.json(profileState);
  } catch (error: any) {
    console.error(`GET /chat/:sessionId/profile error:`, error);
    res.status(500).json({ error: 'Failed to fetch profile', detail: error.message });
  }
});

export default router;
