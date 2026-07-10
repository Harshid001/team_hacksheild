/**
 * report.route.ts — REST endpoints for report generation and retrieval.
 *
 * POST /api/report/:sessionId/generate → trigger analytics + report composition → return { report }
 * GET  /api/report/:sessionId          → return saved report
 */

import { Router } from 'express';
import { generateReport, getReport } from '../services/reportComposer.service';
import { ConversationSession } from '../db/models/ConversationSession.model';

const router = Router();

// POST /api/report/:sessionId/generate
router.post('/:sessionId/generate', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists and is completed
    const session = await ConversationSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }
    if (session.status !== 'completed') {
      res.status(400).json({
        error: 'Conversation not yet completed. Finish all questions before generating a report.',
      });
      return;
    }

    console.log(`Generating report for session ${sessionId}...`);
    const report = await generateReport(sessionId);
    console.log(`Report generated for session ${sessionId}`);

    res.json({ report });
  } catch (error: any) {
    console.error(`POST /report/:sessionId/generate error:`, error);
    res.status(500).json({ error: 'Failed to generate report', detail: error.message });
  }
});

// GET /api/report/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const report = await getReport(sessionId);
    if (!report) {
      res.status(404).json({
        error: `No report found for session ${sessionId}. Generate one first.`,
      });
      return;
    }

    res.json({ report });
  } catch (error: any) {
    console.error(`GET /report/:sessionId error:`, error);
    res.status(500).json({ error: 'Failed to fetch report', detail: error.message });
  }
});

export default router;
