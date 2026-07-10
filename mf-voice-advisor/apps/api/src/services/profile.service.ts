/**
 * profile.service.ts — Deterministic Business Logic (extracted from conversation.service.ts)
 *
 * Contains ONLY pure business logic — NO conversational text, NO LLM calls.
 * - Risk classification (deterministic, auditable)
 * - Category recommendation (deterministic)
 * - Profile state helpers
 *
 * Used by chat.service.ts (tool handlers) and reportComposer.service.ts
 */

import { UserProfile, IUserProfile } from '../db/models/UserProfile.model';
import { ConversationSession } from '../db/models/ConversationSession.model';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationState {
  age: number | null;
  investmentAmount: number | null;
  goal: string | null;
  incomeStability: 'stable' | 'unstable' | null;
  horizonYears: number | null;
  riskReaction: string | null;
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

export function profileToState(profile: any): ConversationState {
  return {
    age: profile.ageGroup ? parseInt(profile.ageGroup, 10) : null,
    investmentAmount: profile.monthlyInvestment ? parseInt(profile.monthlyInvestment, 10) : null,
    goal: profile.targetGoal || null,
    incomeStability: 'stable', // We omit this from the new schema, or assume stable for simplicity
    horizonYears: profile.timeHorizon ? parseInt(profile.timeHorizon, 10) : null,
    riskReaction: profile.riskTolerance || null,
  };
}

export function getMissingFields(state: ConversationState): string[] {
  const missing: string[] = [];
  if (state.age === null) missing.push('age');
  if (state.investmentAmount === null) missing.push('investmentAmount');
  if (state.goal === null) missing.push('goal');
  if (state.incomeStability === null) missing.push('incomeStability');
  if (state.horizonYears === null) missing.push('horizonYears');
  if (state.riskReaction === null) missing.push('riskReaction');
  return missing;
}

export function isProfileComplete(state: ConversationState): boolean {
  return getMissingFields(state).length === 0;
}

// ---------------------------------------------------------------------------
// Risk classification — DETERMINISTIC, not LLM (auditable)
// ---------------------------------------------------------------------------

export function classifyRisk(state: ConversationState): 'low' | 'medium' | 'high' {
  let score = 0;

  // Age factor: younger = higher risk tolerance
  if (state.age !== null) {
    if (state.age < 30) score += 3;
    else if (state.age < 45) score += 2;
    else if (state.age < 55) score += 1;
    // 55+ adds 0
  }

  // Horizon factor: longer = higher risk tolerance
  if (state.horizonYears !== null) {
    if (state.horizonYears >= 10) score += 3;
    else if (state.horizonYears >= 5) score += 2;
    else if (state.horizonYears >= 3) score += 1;
    // <3 years adds 0
  }

  // Income stability factor
  if (state.incomeStability === 'stable') score += 2;
  // unstable adds 0

  // Risk reaction factor (keyword-based analysis of their free-text answer)
  if (state.riskReaction) {
    const reaction = state.riskReaction.toLowerCase();
    const calmKeywords = ['hold', 'wait', 'stay', 'opportunity', 'buy more', 'patient', 'long term', 'fine', 'ok', 'okay', 'invest more'];
    const nervousKeywords = ['sell', 'withdraw', 'panic', 'scared', 'worried', 'afraid', 'loss', 'risky', 'pull out', 'remove', 'take out'];

    const calmCount = calmKeywords.filter(kw => reaction.includes(kw)).length;
    const nervousCount = nervousKeywords.filter(kw => reaction.includes(kw)).length;

    if (calmCount > nervousCount) score += 3;
    else if (calmCount === nervousCount) score += 1;
    // nervous dominant adds 0
  }

  // Classify based on total score (max = 11)
  if (score >= 8) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Category recommendation — DETERMINISTIC based on risk + horizon
// ---------------------------------------------------------------------------

export function recommendCategory(
  riskCapacity: 'low' | 'medium' | 'high',
  horizonYears: number | null
): string {
  const horizon = horizonYears ?? 5;

  if (riskCapacity === 'low') {
    return horizon <= 3 ? 'Debt' : 'Hybrid';
  }
  if (riskCapacity === 'medium') {
    if (horizon <= 3) return 'Hybrid';
    if (horizon <= 7) return 'Large Cap';
    return 'Flexi Cap';
  }
  // high risk
  if (horizon <= 3) return 'Large Cap';
  if (horizon <= 7) return 'Mid Cap';
  return 'Small Cap';
}

// ---------------------------------------------------------------------------
// Profile CRUD — used as tool handlers by chat.service.ts
// ---------------------------------------------------------------------------

/**
 * Update user profile with partial data. Returns the updated profile state.
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<ConversationState>
): Promise<{ updated: ConversationState; missingFields: string[]; isComplete: boolean }> {
  const updateData: Record<string, any> = {};

  if (data.age !== undefined && data.age !== null) updateData.ageGroup = data.age.toString(); // mapping age to ageGroup for simplicity, or we can add 'age' to schema
  if (data.investmentAmount !== undefined && data.investmentAmount !== null) updateData.monthlyInvestment = data.investmentAmount.toString();
  if (data.goal !== undefined && data.goal !== null) updateData.targetGoal = data.goal;
  // if (data.incomeStability !== undefined && data.incomeStability !== null) updateData.incomeStability = data.incomeStability; // not in new schema, ignore or add
  if (data.horizonYears !== undefined && data.horizonYears !== null) updateData.timeHorizon = data.horizonYears.toString();
  if (data.riskReaction !== undefined && data.riskReaction !== null) updateData.riskTolerance = data.riskReaction;

  if (Object.keys(updateData).length > 0) {
    await FinancialProfile.updateOne(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: updateData }
    );
  }

  const profile = await FinancialProfile.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!profile) throw new Error(`No profile found for user ${userId}`);

  const state = profileToState(profile as any);
  const missing = getMissingFields(state);
  const complete = missing.length === 0;

  // If complete, mark profile and session done
  if (complete) {
    profile.isComplete = true;
    await profile.save();
    // We can't update ConversationSession here unless we pass sessionId
  }

  return { updated: state, missingFields: missing, isComplete: complete };
}

/**
 * Get the current profile state for a user.
 */
export async function getProfileState(userId: string): Promise<{
  state: ConversationState;
  missingFields: string[];
  isComplete: boolean;
  riskCapacity?: string;
  recommendedCategory?: string;
}> {
  const profile = await FinancialProfile.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!profile) throw new Error(`No profile found for user ${userId}`);

  const state = profileToState(profile as any);
  const missing = getMissingFields(state);
  const complete = missing.length === 0;

  const result: any = { state, missingFields: missing, isComplete: complete };

  if (complete) {
    const riskCapacity = classifyRisk(state);
    result.riskCapacity = riskCapacity;
    result.recommendedCategory = recommendCategory(riskCapacity, state.horizonYears);
  }

  return result;
}
