/**
<<<<<<< HEAD
 * apps/web/lib/speechSynthesis.ts
 *
 * Wrapper around the browser's native SpeechSynthesis API.
 * Reads the bot's questions/report aloud. Supports cancel/interrupt
 * mid-speech for a "stop talking" / barge-in feel.
 * Owned by: Member A (Voice/STT Engineer)
 */

export type SpeakOptions = {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  voiceName?: string; // optional specific voice by name
  onEnd?: () => void;
  onStart?: () => void;
};

class BrowserSpeechSynthesis {
  private synth: SpeechSynthesis | null =
    typeof window !== "undefined" ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  isSupported(): boolean {
    return this.synth !== null;
  }

  /**
   * speak
   *
   * Speaks the given text aloud. Automatically cancels any currently
   * playing speech first, so calling speak() again acts as an interrupt —
   * useful for barge-in ("stop talking, I have something to say").
   */
  speak(text: string, options: SpeakOptions = {}) {
    if (!this.synth) return;

    // Cancel anything currently speaking/queued first
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    if (options.voiceName) {
      const voice = this.synth
        .getVoices()
        .find((v) => v.name === options.voiceName);
      if (voice) utterance.voice = voice;
    }

    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /** Immediately stop any speech in progress (barge-in / "stop talking"). */
  cancel() {
    if (!this.synth) return;
    this.synth.cancel();
    this.currentUtterance = null;
  }

  /** Pause current speech (can be resumed). */
  pause() {
    this.synth?.pause();
  }

  /** Resume paused speech. */
  resume() {
    this.synth?.resume();
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  /** List available system voices (populated async by some browsers). */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() ?? [];
  }
}

// Convenience singleton — the app only ever needs one voice output channel
let sharedInstance: BrowserSpeechSynthesis | null = null;

export function getSpeechSynthesis(): BrowserSpeechSynthesis {
  if (!sharedInstance) {
    sharedInstance = new BrowserSpeechSynthesis();
  }
  return sharedInstance;
}

/** Simple one-off convenience function for quick usage in components. */
export function speak(text: string, options?: SpeakOptions) {
  getSpeechSynthesis().speak(text, options);
}

/** Simple one-off convenience function to interrupt speech immediately. */
export function stopSpeaking() {
  getSpeechSynthesis().cancel();
}
=======
 * conversation.service.ts — Adaptive Conversation Service
 *
 * Uses Ollama to generate natural follow-up questions.
 * Tracks ConversationState (Section 7) until all 6 fields are filled.
 * Risk classification is DETERMINISTIC (not LLM) — auditable for judges.
 *
 * Exports match what conversation.route.ts and conversation.socket.ts expect:
 *   - startConversation(sessionId) → { sessionId, firstQuestion, fieldTargeted }
 *   - processAnswer(sessionId, answerText, audioBlob?) → { nextQuestion, isComplete, fieldTargeted }
 *   - getHistory(sessionId) → Answer[]
 */

import { chatCompletion } from './ollama.service';
import { Answer } from '../db/models/Answer.model';
import { UserProfile, IUserProfile } from '../db/models/UserProfile.model';
import { ConversationSession } from '../db/models/ConversationSession.model';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Types (inline to avoid cross-package import issues in monorepo)
// ---------------------------------------------------------------------------

interface ConversationState {
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

function profileToState(profile: IUserProfile): ConversationState {
  return {
    age: profile.age,
    investmentAmount: profile.investmentAmount,
    goal: profile.goal,
    incomeStability: profile.incomeStability,
    horizonYears: profile.horizonYears,
    riskReaction: profile.riskReaction,
  };
}

function getMissingFields(state: ConversationState): string[] {
  const missing: string[] = [];
  if (state.age === null) missing.push('age');
  if (state.investmentAmount === null) missing.push('investmentAmount');
  if (state.goal === null) missing.push('goal');
  if (state.incomeStability === null) missing.push('incomeStability');
  if (state.horizonYears === null) missing.push('horizonYears');
  if (state.riskReaction === null) missing.push('riskReaction');
  return missing;
}

function isComplete(state: ConversationState): boolean {
  return getMissingFields(state).length === 0;
}

// ---------------------------------------------------------------------------
// Risk classification — DETERMINISTIC, not LLM (auditable)
// ---------------------------------------------------------------------------

function classifyRisk(state: ConversationState): 'low' | 'medium' | 'high' {
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
// Ollama prompts for adaptive conversation
// ---------------------------------------------------------------------------

const QUESTION_SYSTEM_PROMPT = `You are a friendly, empathetic financial advisor helping a first-time investor in India understand mutual funds. You are having a natural voice conversation.

YOUR TASK: Look at the conversation so far and the list of MISSING fields, then ask ONE natural follow-up question to fill the MOST RELEVANT missing field.

RULES:
1. Ask ONLY ONE question at a time
2. Keep the question SHORT (1-2 sentences max) — this is a voice conversation
3. The question must sound natural and conversational, NOT like a form
4. Never follow a fixed script — the next question should logically follow from what the user just said
5. Be warm and encouraging — this person is new to investing
6. Do NOT give any investment advice — just gather information
7. Do NOT use technical jargon
8. Respond ONLY with the question text — no explanations, no preamble

FIELD DESCRIPTIONS:
- age: How old the user is
- investmentAmount: How much they want to invest (in rupees)
- goal: Why they want to invest (retirement, wedding, house, education, emergency fund, etc.)
- incomeStability: Whether their income is stable/salaried or variable/freelance
- horizonYears: How many years they plan to stay invested
- riskReaction: How they would react if their investment dropped 15% in value — this is the SCENARIO question`;

const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction assistant. Extract structured information from the user's natural language answer.

Given the user's answer and the field being targeted, extract the value.

RESPOND ONLY WITH A VALID JSON OBJECT. No other text, no markdown, no explanation.

EXTRACTION RULES:
- For "age": Extract the number. If they say "I'm twenty-eight", output {"age": 28}
- For "investmentAmount": Extract the amount in rupees. "50 thousand" = 50000, "2 lakh" = 200000, "5L" = 500000, "10k" = 10000. Output {"investmentAmount": <number>}
- For "goal": Categorize as one of: "retirement", "wedding", "house", "education", "emergency", "wealth", "other". Output {"goal": "<category>"}
- For "incomeStability": Classify as "stable" (salaried, government job, regular income) or "unstable" (freelance, business, variable income). Output {"incomeStability": "stable"} or {"incomeStability": "unstable"}
- For "horizonYears": Extract the number of years. "5 years" = 5, "long term" = 10, "short term" = 2, "medium term" = 5. Output {"horizonYears": <number>}
- For "riskReaction": Keep as free text — this is their emotional reaction. Output {"riskReaction": "<their answer>"}

If you CANNOT extract the value from the answer, output {"extracted": false}`;

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Start a new conversation — returns the first question.
 * Called by conversation.route.ts POST /start
 */
export const startConversation = async (sessionId: string) => {
  // Create an empty UserProfile for this session
  const profile = new UserProfile({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  });
  await profile.save();

  const firstQuestion = "Hi there! I'm here to help you understand mutual funds better. To get started, could you tell me — what's your age?";
  const fieldTargeted = 'age';

  // Save this as the first answer entry (question only, no answer yet)
  return {
    sessionId,
    firstQuestion,
    fieldTargeted,
  };
};

/**
 * Process a user's answer — extract fields, update profile, generate next question.
 * Called by conversation.route.ts POST /:sessionId/answer
 * AND by conversation.socket.ts on "user_speech" event.
 */
export const processAnswer = async (
  sessionId: string,
  answerText: string,
  audioBlob?: any
): Promise<{ nextQuestion: string; isComplete: boolean; fieldTargeted: string }> => {
  // 1. Get the user profile
  const profile = await UserProfile.findOne({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  });
  if (!profile) {
    throw new Error(`No user profile found for session ${sessionId}`);
  }

  // 2. Get conversation history to determine what was last asked
  const history = await Answer.find({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  }).sort({ createdAt: 1 });

  // 3. Determine which field was being targeted
  const currentState = profileToState(profile);
  const missing = getMissingFields(currentState);

  // Determine field targeted by looking at last answer's field or first missing
  let fieldTargeted: string;
  if (history.length > 0) {
    fieldTargeted = history[history.length - 1].fieldTargeted;
  } else {
    fieldTargeted = missing[0] || 'age';
  }

  // 4. Extract the field value from the answer using Ollama
  let extracted: Record<string, any> = {};
  try {
    const extractionPrompt = `The user was asked about "${fieldTargeted}". Their answer is: "${answerText}"

Extract the value for the "${fieldTargeted}" field.`;

    const extractionResult = await chatCompletion(
      EXTRACTION_SYSTEM_PROMPT,
      extractionPrompt,
      { temperature: 0.1, num_predict: 200 }
    );

    // Parse JSON from the response — handle potential markdown code fences
    let jsonStr = extractionResult.trim();
    // Strip ```json ... ``` wrappers if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    // Also handle /think tags from qwen3
    const thinkMatch = jsonStr.match(/<\/think>\s*([\s\S]*)/);
    if (thinkMatch) {
      jsonStr = thinkMatch[1].trim();
    }
    // Try to find JSON object in the string
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    }

    extracted = JSON.parse(jsonStr);
  } catch (err) {
    console.warn(`Field extraction failed for "${fieldTargeted}":`, err);
    // Fallback: store raw answer for riskReaction, skip for others
    if (fieldTargeted === 'riskReaction') {
      extracted = { riskReaction: answerText };
    }
  }

  // 5. Update the profile with extracted values
  const updateData: Record<string, any> = {};

  if (extracted.age !== undefined && typeof extracted.age === 'number') {
    updateData.age = extracted.age;
  }
  if (extracted.investmentAmount !== undefined && typeof extracted.investmentAmount === 'number') {
    updateData.investmentAmount = extracted.investmentAmount;
  }
  if (extracted.goal !== undefined && typeof extracted.goal === 'string') {
    updateData.goal = extracted.goal;
  }
  if (extracted.incomeStability !== undefined) {
    updateData.incomeStability = extracted.incomeStability === 'stable' ? 'stable' : 'unstable';
  }
  if (extracted.horizonYears !== undefined && typeof extracted.horizonYears === 'number') {
    updateData.horizonYears = extracted.horizonYears;
  }
  if (extracted.riskReaction !== undefined && typeof extracted.riskReaction === 'string') {
    updateData.riskReaction = extracted.riskReaction;
  }

  if (Object.keys(updateData).length > 0) {
    await UserProfile.updateOne(
      { sessionId: new mongoose.Types.ObjectId(sessionId) },
      { $set: updateData }
    );
  }

  // 6. Re-fetch profile and check completion
  const updatedProfile = await UserProfile.findOne({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  });
  if (!updatedProfile) {
    throw new Error(`Profile disappeared for session ${sessionId}`);
  }

  const updatedState = profileToState(updatedProfile);
  const nowComplete = isComplete(updatedState);

  // 7. If complete, classify risk and mark session done
  if (nowComplete) {
    const riskCapacity = classifyRisk(updatedState);
    await UserProfile.updateOne(
      { sessionId: new mongoose.Types.ObjectId(sessionId) },
      { $set: { riskCapacity } }
    );
    await ConversationSession.updateOne(
      { _id: new mongoose.Types.ObjectId(sessionId) },
      { $set: { status: 'completed' } }
    );

    // Save this final answer
    await new Answer({
      sessionId: new mongoose.Types.ObjectId(sessionId),
      question: history.length > 0 ? history[history.length - 1].fieldTargeted : fieldTargeted,
      answerText,
      fieldTargeted,
    }).save();

    return {
      nextQuestion: `Thank you! I now have everything I need to analyze mutual fund options that match your profile. Let me generate your personalized report.`,
      isComplete: true,
      fieldTargeted: 'complete',
    };
  }

  // 8. Generate the next question using Ollama
  const newMissing = getMissingFields(updatedState);

  // Build chat history for context
  const chatHistoryStr = history
    .map((a) => `Q (targeting ${a.fieldTargeted}): ${a.question}\nA: ${a.answerText}`)
    .join('\n\n');

  const userPrompt = `CONVERSATION SO FAR:
${chatHistoryStr}
${chatHistoryStr ? '\n' : ''}Latest answer (targeting ${fieldTargeted}): "${answerText}"

CURRENT STATE (filled fields):
${updatedState.age !== null ? `- Age: ${updatedState.age}` : ''}
${updatedState.investmentAmount !== null ? `- Investment amount: ₹${updatedState.investmentAmount}` : ''}
${updatedState.goal !== null ? `- Goal: ${updatedState.goal}` : ''}
${updatedState.incomeStability !== null ? `- Income: ${updatedState.incomeStability}` : ''}
${updatedState.horizonYears !== null ? `- Horizon: ${updatedState.horizonYears} years` : ''}
${updatedState.riskReaction !== null ? `- Risk reaction: answered` : ''}

MISSING FIELDS (need to ask about): ${newMissing.join(', ')}

Generate ONE natural follow-up question targeting the most relevant missing field. The question should flow naturally from what was just discussed.`;

  let nextQuestion: string;
  let nextField: string = newMissing[0];

  try {
    const response = await chatCompletion(
      QUESTION_SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.8, num_predict: 150 }
    );

    // Clean response — remove any thinking tags from qwen3
    nextQuestion = response
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();

    // If response is empty after cleanup, use fallback
    if (!nextQuestion) {
      nextQuestion = getFallbackQuestion(nextField);
    }
  } catch (err) {
    console.error('Ollama question generation failed, using fallback:', err);
    nextQuestion = getFallbackQuestion(nextField);
  }

  // 9. Save this Q&A exchange
  await new Answer({
    sessionId: new mongoose.Types.ObjectId(sessionId),
    question: nextQuestion,
    answerText,
    fieldTargeted,
  }).save();

  return {
    nextQuestion,
    isComplete: false,
    fieldTargeted: nextField,
  };
};

/**
 * Get conversation history for a session.
 */
export const getHistory = async (sessionId: string) => {
  const answers = await Answer.find({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  }).sort({ createdAt: 1 });

  return answers.map((a) => ({
    question: a.question,
    answerText: a.answerText,
    fieldTargeted: a.fieldTargeted,
    createdAt: a.createdAt,
  }));
};

// ---------------------------------------------------------------------------
// Fallback questions — used when Ollama is unavailable or returns empty
// ---------------------------------------------------------------------------

function getFallbackQuestion(field: string): string {
  const fallbacks: Record<string, string> = {
    age: "Could you tell me your age?",
    investmentAmount: "How much are you thinking of investing? Even a rough amount in rupees helps.",
    goal: "What's the main reason you want to invest? For example, retirement, buying a house, your child's education?",
    incomeStability: "Is your income generally stable, like from a salaried job, or does it vary month to month?",
    horizonYears: "How many years do you plan to keep this money invested before you'll need it?",
    riskReaction: "Here's a scenario — imagine you invested some money and within a few months, it dropped by 15%. What would be your first reaction?",
  };
  return fallbacks[field] || "Could you tell me more about your financial situation?";
}
>>>>>>> 853d67c (env and package.json and tsconfig.json has been added)
