/**
 * Shared constants for the MF Voice Advisor project.
 * Section 8 — Ground Rules (Non-Negotiable)
 */

// ---------------------------------------------------------------------------
// Required disclaimer — must appear before conversation AND at top of reports
// ---------------------------------------------------------------------------

export const DISCLAIMER_TEXT =
  'This tool analyzes past performance of publicly available mutual fund data. ' +
  'Past performance does not guarantee future returns. ' +
  'This is an educational tool, not personalized investment advice.';

// ---------------------------------------------------------------------------
// Risk capacity categories
// ---------------------------------------------------------------------------

export const RISK_CATEGORIES = ['low', 'medium', 'high'] as const;
export type RiskCapacity = (typeof RISK_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Conversation fields the adaptive engine must fill (Section 7)
// ---------------------------------------------------------------------------

export const CONVERSATION_FIELDS = [
  'age',
  'investmentAmount',
  'goal',
  'incomeStability',
  'horizonYears',
  'riskReaction',
] as const;

export type ConversationField = (typeof CONVERSATION_FIELDS)[number];

// ---------------------------------------------------------------------------
// Fund categories used in the curated list
// ---------------------------------------------------------------------------

export const FUND_CATEGORIES = [
  'Large Cap',
  'Mid Cap',
  'Small Cap',
  'Flexi Cap',
  'Hybrid',
  'Debt',
] as const;

export type FundCategory = (typeof FUND_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Stage labels for progress visualization (Section 7)
// ---------------------------------------------------------------------------

export const STAGE_LABELS = [
  'Age',
  'Investment Amount',
  'Goal',
  'Income Stability',
  'Horizon Years',
  'Risk Reaction',
] as const;
