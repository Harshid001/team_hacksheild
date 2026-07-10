/**
 * conversation.route.ts — REST endpoints for the conversation flow.
 *
 * POST /api/conversation/start           → create session → return { sessionId, firstQuestion }
 * POST /api/conversation/:sessionId/answer → process answer → return { nextQuestion, isComplete }
 * GET  /api/conversation/:sessionId/history → return all Q&A pairs
 */

import { Router } from 'express';
import { startConversation, processAnswer, getHistory } from '../services/conversation.service';
import { ConversationSession } from '../db/models/ConversationSession.model';

const router = Router();

// POST /api/conversation/start
router.post('/start', async (req, res) => {
  try {
    // Create a new ConversationSession in MongoDB
    const session = new ConversationSession();
    await session.save();

    // Initialize conversation — creates UserProfile, returns first question
    const result = await startConversation(session._id.toString());

    res.json({
      sessionId: session._id,
      firstQuestion: result.firstQuestion,
      fieldTargeted: result.fieldTargeted,
    });
  } catch (error: any) {
    console.error('POST /start error:', error);
    res.status(500).json({ error: 'Failed to start conversation', detail: error.message });
  }
});

// POST /api/conversation/:sessionId/answer
router.post('/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answerText, audioBlob } = req.body;

    if (!answerText || typeof answerText !== 'string') {
      res.status(400).json({ error: 'answerText is required and must be a string' });
      return;
    }

    // Verify session exists
    const session = await ConversationSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }
    if (session.status === 'completed') {
      res.status(400).json({ error: 'Conversation already completed', isComplete: true });
      return;
    }

    const result = await processAnswer(sessionId, answerText, audioBlob);
    res.json(result);
  } catch (error: any) {
    console.error(`POST /:sessionId/answer error:`, error);
    res.status(500).json({ error: 'Failed to process answer', detail: error.message });
  }
});

// GET /api/conversation/:sessionId/history
router.get('/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const session = await ConversationSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }

    const history = await getHistory(sessionId);
    res.json({ sessionId, history, status: session.status });
  } catch (error: any) {
    console.error(`GET /:sessionId/history error:`, error);
    res.status(500).json({ error: 'Failed to fetch history', detail: error.message });
  }
});

export default router;
