/**
 * Curated list of Indian mutual fund schemes used by the MF Voice Advisor.
 *
 * These scheme codes are verified against mfapi.in and must stay in sync
 * with the Python analytics-service's CURATED_FUNDS in main.py.
 *
 * @see docs/FUND_LIST.md for the full reference table and caching strategy.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FundCategory =
  | "Large Cap"
  | "Mid Cap"
  | "Small Cap"
  | "Flexi Cap"
  | "Hybrid"
  | "Debt";

export interface FundEntry {
  /** AMFI scheme code (string, not number — API expects string) */
  schemeCode: string;
  /** Full scheme name as listed on AMFI / mfapi.in */
  schemeName: string;
  /** Broad fund category for risk mapping */
  category: FundCategory;
  /** Fund house / AMC name */
  fundHouse: string;
}

// ---------------------------------------------------------------------------
// Curated fund list — 14 schemes across 6 categories
// ---------------------------------------------------------------------------

export const CURATED_FUNDS: readonly FundEntry[] = [
  // ── Large Cap (3) ──────────────────────────────────────────────────────
  {
    schemeCode: "120503",
    schemeName: "SBI Blue Chip Fund - Direct Plan - Growth",
    category: "Large Cap",
    fundHouse: "SBI Mutual Fund",
  },
  {
    schemeCode: "120586",
    schemeName: "ICICI Prudential Bluechip Fund - Direct Plan - Growth",
    category: "Large Cap",
    fundHouse: "ICICI Prudential Mutual Fund",
  },
  {
    schemeCode: "119180",
    schemeName: "HDFC Top 100 Fund - Direct Plan - Growth",
    category: "Large Cap",
    fundHouse: "HDFC Mutual Fund",
  },

  // ── Mid Cap (3) ────────────────────────────────────────────────────────
  {
    schemeCode: "118989",
    schemeName: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth",
    category: "Mid Cap",
    fundHouse: "HDFC Mutual Fund",
  },
  {
    schemeCode: "125497",
    schemeName: "Kotak Emerging Equity Fund - Direct Plan - Growth",
    category: "Mid Cap",
    fundHouse: "Kotak Mahindra Mutual Fund",
  },
  {
    schemeCode: "120504",
    schemeName: "SBI Magnum Midcap Fund - Direct Plan - Growth",
    category: "Mid Cap",
    fundHouse: "SBI Mutual Fund",
  },

  // ── Small Cap (2) ──────────────────────────────────────────────────────
  {
    schemeCode: "125307",
    schemeName: "SBI Small Cap Fund - Direct Plan - Growth",
    category: "Small Cap",
    fundHouse: "SBI Mutual Fund",
  },
  {
    schemeCode: "125354",
    schemeName: "Nippon India Small Cap Fund - Direct Plan - Growth",
    category: "Small Cap",
    fundHouse: "Nippon India Mutual Fund",
  },

  // ── Flexi Cap (2) ──────────────────────────────────────────────────────
  {
    schemeCode: "122639",
    schemeName: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    category: "Flexi Cap",
    fundHouse: "PPFAS Mutual Fund",
  },
  {
    schemeCode: "125494",
    schemeName: "Kotak Flexicap Fund - Direct Plan - Growth",
    category: "Flexi Cap",
    fundHouse: "Kotak Mahindra Mutual Fund",
  },

  // ── Hybrid (2) ─────────────────────────────────────────────────────────
  {
    schemeCode: "119551",
    schemeName: "ICICI Prudential Equity & Debt Fund - Direct Plan - Growth",
    category: "Hybrid",
    fundHouse: "ICICI Prudential Mutual Fund",
  },
  {
    schemeCode: "118834",
    schemeName: "HDFC Balanced Advantage Fund - Direct Plan - Growth",
    category: "Hybrid",
    fundHouse: "HDFC Mutual Fund",
  },

  // ── Debt (2) ───────────────────────────────────────────────────────────
  {
    schemeCode: "135740",
    schemeName: "HDFC Corporate Bond Fund - Direct Plan - Growth",
    category: "Debt",
    fundHouse: "HDFC Mutual Fund",
  },
  {
    schemeCode: "119088",
    schemeName: "SBI Magnum Medium Duration Fund - Direct Plan - Growth",
    category: "Debt",
    fundHouse: "SBI Mutual Fund",
  },
] as const;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All distinct fund categories in the curated list. */
export const FUND_CATEGORIES: readonly FundCategory[] = [
  "Large Cap",
  "Mid Cap",
  "Small Cap",
  "Flexi Cap",
  "Hybrid",
  "Debt",
] as const;

/**
 * Risk-level mapping for each category.
 * Used by the report composer to match user risk profile → fund category.
 */
export const CATEGORY_RISK_MAP: Record<FundCategory, "low" | "medium" | "high"> = {
  "Debt": "low",
  "Hybrid": "low",
  "Large Cap": "medium",
  "Flexi Cap": "medium",
  "Mid Cap": "high",
  "Small Cap": "high",
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Filter the curated list by category.
 */
export function getFundsByCategory(category: FundCategory): FundEntry[] {
  return CURATED_FUNDS.filter((f) => f.category === category);
}

/**
 * Look up a single fund by scheme code.
 * Returns undefined if the code is not in the curated list.
 */
export function getFundByCode(schemeCode: string): FundEntry | undefined {
  return CURATED_FUNDS.find((f) => f.schemeCode === schemeCode);
}

/**
 * Get all funds matching a given risk capacity.
 * Maps risk capacity (from UserProfile) → appropriate fund categories.
 */
export function getFundsForRiskCapacity(
  riskCapacity: "low" | "medium" | "high"
): FundEntry[] {
  const matchingCategories = (
    Object.entries(CATEGORY_RISK_MAP) as [FundCategory, string][]
  )
    .filter(([_, risk]) => risk === riskCapacity)
    .map(([cat]) => cat);

  return CURATED_FUNDS.filter((f) =>
    matchingCategories.includes(f.category)
  );
}
