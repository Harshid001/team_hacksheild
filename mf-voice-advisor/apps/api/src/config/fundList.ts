/**
 * config/fundList.ts — Curated fund list (14 schemes across 6 categories)
 *
 * MUST stay in sync with the Python analytics service's CURATED_FUNDS in main.py.
 * These are the funds we seed metrics for and recommend in reports.
 */

export interface CuratedFund {
  schemeCode: string;
  schemeName: string;
  category: string;
  fundHouse: string;
}

export const CURATED_FUNDS: CuratedFund[] = [
  // ── Large Cap (3) ────────────────────────────────────────────
  {
    schemeCode: '120503',
    schemeName: 'SBI Blue Chip Fund - Direct Plan - Growth',
    category: 'Large Cap',
    fundHouse: 'SBI Mutual Fund',
  },
  {
    schemeCode: '120586',
    schemeName: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth',
    category: 'Large Cap',
    fundHouse: 'ICICI Prudential Mutual Fund',
  },
  {
    schemeCode: '119180',
    schemeName: 'HDFC Top 100 Fund - Direct Plan - Growth',
    category: 'Large Cap',
    fundHouse: 'HDFC Mutual Fund',
  },

  // ── Mid Cap (3) ──────────────────────────────────────────────
  {
    schemeCode: '118989',
    schemeName: 'HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth',
    category: 'Mid Cap',
    fundHouse: 'HDFC Mutual Fund',
  },
  {
    schemeCode: '125497',
    schemeName: 'Kotak Emerging Equity Fund - Direct Plan - Growth',
    category: 'Mid Cap',
    fundHouse: 'Kotak Mahindra Mutual Fund',
  },
  {
    schemeCode: '120504',
    schemeName: 'SBI Magnum Midcap Fund - Direct Plan - Growth',
    category: 'Mid Cap',
    fundHouse: 'SBI Mutual Fund',
  },

  // ── Small Cap (2) ────────────────────────────────────────────
  {
    schemeCode: '125307',
    schemeName: 'SBI Small Cap Fund - Direct Plan - Growth',
    category: 'Small Cap',
    fundHouse: 'SBI Mutual Fund',
  },
  {
    schemeCode: '125354',
    schemeName: 'Nippon India Small Cap Fund - Direct Plan - Growth',
    category: 'Small Cap',
    fundHouse: 'Nippon India Mutual Fund',
  },

  // ── Flexi Cap (2) ────────────────────────────────────────────
  {
    schemeCode: '122639',
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    category: 'Flexi Cap',
    fundHouse: 'PPFAS Mutual Fund',
  },
  {
    schemeCode: '125494',
    schemeName: 'Kotak Flexicap Fund - Direct Plan - Growth',
    category: 'Flexi Cap',
    fundHouse: 'Kotak Mahindra Mutual Fund',
  },

  // ── Hybrid (2) ───────────────────────────────────────────────
  {
    schemeCode: '119551',
    schemeName: 'ICICI Prudential Equity & Debt Fund - Direct Plan - Growth',
    category: 'Hybrid',
    fundHouse: 'ICICI Prudential Mutual Fund',
  },
  {
    schemeCode: '118834',
    schemeName: 'HDFC Balanced Advantage Fund - Direct Plan - Growth',
    category: 'Hybrid',
    fundHouse: 'HDFC Mutual Fund',
  },

  // ── Debt (2) ─────────────────────────────────────────────────
  {
    schemeCode: '135740',
    schemeName: 'HDFC Corporate Bond Fund - Direct Plan - Growth',
    category: 'Debt',
    fundHouse: 'HDFC Mutual Fund',
  },
  {
    schemeCode: '119088',
    schemeName: 'SBI Magnum Medium Duration Fund - Direct Plan - Growth',
    category: 'Debt',
    fundHouse: 'SBI Mutual Fund',
  },
];

/**
 * Expense ratios (mocked — mfapi.in doesn't provide these).
 * Map of schemeCode → expense ratio in percent.
 */
export const EXPENSE_RATIOS: Record<string, number> = {
  '120503': 0.88,
  '120586': 1.05,
  '119180': 1.07,
  '118989': 1.11,
  '125497': 0.58,
  '120504': 0.95,
  '125307': 0.72,
  '125354': 0.87,
  '122639': 0.63,
  '125494': 0.59,
  '119551': 1.20,
  '118834': 1.08,
  '135740': 0.30,
  '119088': 0.72,
};

/**
 * Get funds by category.
 */
export function getFundsByCategory(category: string): CuratedFund[] {
  return CURATED_FUNDS.filter(
    (f) => f.category.toLowerCase() === category.toLowerCase()
  );
}
