/**
 * analyticsClient.service.ts — Internal HTTP client to the Python FastAPI analytics service.
 * NOT exposed to the frontend — only called by the Node API internally.
 *
 * Endpoints called:
 *   POST /compute-metrics        — raw NAV → metrics
 *   GET  /fund-list              — curated fund list
 *   POST /compute-fund-metrics   — schemeCode → fund info + metrics
 *   GET  /cached-metrics         — ALL pre-computed metrics from MongoDB cache
 *   GET  /cached-metrics/:code   — single fund's cached metrics
 */

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// POST /compute-metrics — raw NAV history → computed metrics
// ---------------------------------------------------------------------------

export const computeMetrics = async (
  navHistory: { date: string; nav: number }[],
  riskFreeRate?: number
) => {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}/compute-metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ navHistory, riskFreeRate: riskFreeRate ?? 0.07 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Analytics compute-metrics failed (${response.status}): ${err}`);
  }

  return await response.json();
};

// ---------------------------------------------------------------------------
// GET /fund-list — curated list of 14 Indian mutual fund schemes
// ---------------------------------------------------------------------------

export const getFundList = async () => {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}/fund-list`);

  if (!response.ok) {
    throw new Error(`Analytics fund-list failed (${response.status})`);
  }

  return await response.json();
};

// ---------------------------------------------------------------------------
// POST /compute-fund-metrics — single scheme fetch + compute
// ---------------------------------------------------------------------------

export const computeFundMetrics = async (
  schemeCode: string,
  riskFreeRate?: number
) => {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}/compute-fund-metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schemeCode, riskFreeRate: riskFreeRate ?? 0.07 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Analytics compute-fund-metrics failed (${response.status}): ${err}`);
  }

  return await response.json();
};

// ---------------------------------------------------------------------------
// GET /cached-metrics — ALL pre-computed metrics from the Python service's MongoDB cache
// Used by the Report Composer to load fund data without hitting mfapi.in live
// ---------------------------------------------------------------------------

export const getAllCachedMetrics = async (): Promise<{
  funds: Array<{
    schemeCode: string;
    schemeName: string;
    category: string;
    fundHouse: string;
    cagr: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    expenseRatio: number;
    lastUpdated?: string;
  }>;
  count: number;
}> => {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}/cached-metrics`);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Analytics cached-metrics failed (${response.status}): ${err}`);
  }

  return await response.json();
};

// ---------------------------------------------------------------------------
// GET /cached-metrics/:schemeCode — single fund's cached metrics
// ---------------------------------------------------------------------------

export const getCachedFundMetrics = async (schemeCode: string) => {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}/cached-metrics/${schemeCode}`);

  if (!response.ok) {
    if (response.status === 404) return null; // Not cached yet
    const err = await response.text();
    throw new Error(`Analytics cached-metrics/${schemeCode} failed (${response.status}): ${err}`);
  }

  return await response.json();
};

// ---------------------------------------------------------------------------
// GET /health — analytics service health check
// ---------------------------------------------------------------------------

export const checkAnalyticsHealth = async (): Promise<{
  ok: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch(`${ANALYTICS_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return { ok: false, error: `Analytics service returned ${response.status}` };
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: `Cannot reach analytics service at ${ANALYTICS_SERVICE_URL}: ${error.message}`,
    };
  }
};
