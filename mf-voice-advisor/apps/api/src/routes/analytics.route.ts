/**
 * analytics.route.ts — Proxy endpoints for frontend convenience.
 *
 * These proxy to the Python FastAPI analytics service so the frontend
 * only needs to know about one backend URL (the Node API).
 *
 * GET  /api/analytics/fund-list       → proxies to Python /fund-list
 * GET  /api/analytics/cached-metrics  → proxies to Python /cached-metrics
 */

import { Router } from 'express';
import { getFundList, getAllCachedMetrics, checkAnalyticsHealth } from '../services/analyticsClient.service';

const router = Router();

// GET /api/analytics/fund-list
router.get('/fund-list', async (req, res) => {
  try {
    const data = await getFundList();
    res.json(data);
  } catch (error: any) {
    console.error('GET /analytics/fund-list error:', error);
    res.status(502).json({
      error: 'Analytics service unavailable',
      detail: error.message,
    });
  }
});

// GET /api/analytics/cached-metrics
router.get('/cached-metrics', async (req, res) => {
  try {
    const data = await getAllCachedMetrics();
    res.json(data);
  } catch (error: any) {
    console.error('GET /analytics/cached-metrics error:', error);
    res.status(502).json({
      error: 'Analytics service unavailable',
      detail: error.message,
    });
  }
});

// GET /api/analytics/health
router.get('/health', async (req, res) => {
  try {
    const health = await checkAnalyticsHealth();
    res.json(health);
  } catch (error: any) {
    res.status(502).json({ ok: false, error: error.message });
  }
});

export default router;
