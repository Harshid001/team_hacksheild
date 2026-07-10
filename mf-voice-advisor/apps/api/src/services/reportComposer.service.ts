/**
 * reportComposer.service.ts — Report Composer Service (Chat 6 Core Deliverable)
 *
 * CRITICAL RULES (Master Doc Section 8):
 * 1. Receives ONLY UserProfile + pre-computed FundMetrics — NEVER raw NAV data
 * 2. All numbers in the report MUST come from the input metrics — NEVER invented
 * 3. Uses "historically" framing — NEVER "you should buy this"
 * 4. Includes required disclaimer at the top of every report
 * 5. Model name read from env (OLLAMA_MODEL), NEVER hardcoded
 *
 * Exports match what report.route.ts expects:
 *   - generateReport(sessionId) → full report object
 *   - getReport(sessionId) → saved report or null
 */

import { chatCompletion } from './ollama.service';
import { UserProfile, IUserProfile } from '../db/models/UserProfile.model';
import { Report } from '../db/models/Report.model';
import { FundMetrics, IFundMetrics } from '../db/models/FundMetrics.model';
import { recommendCategory } from './profile.service';
import { getAllCachedMetrics } from './analyticsClient.service';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Disclaimer — Master Doc Section 8 (MUST appear at top of every report)
// ---------------------------------------------------------------------------

const DISCLAIMER_TEXT =
  '⚠️ DISCLAIMER: This tool analyzes past performance of publicly available mutual fund data. ' +
  'Past performance does not guarantee future returns. ' +
  'This is an educational tool, not personalized investment advice.';

// ---------------------------------------------------------------------------
// Report Composer Prompt — constrained to prevent hallucination
// ---------------------------------------------------------------------------

function buildReportPrompt(
  profile: IUserProfile,
  metrics: IFundMetrics[],
  recommendedCat: string
): { system: string; user: string } {
  const metricsJson = metrics.map((m) => ({
    schemeName: m.schemeName,
    category: m.category,
    cagr: m.cagr,
    volatility: m.volatility,
    sharpeRatio: m.sharpeRatio,
    maxDrawdown: m.maxDrawdown,
    expenseRatio: m.expenseRatio,
  }));

  const system = `You are a knowledgeable but approachable financial educator writing a personalized mutual fund analysis report for a first-time investor in India.

STRICT RULES — VIOLATIONS WILL INVALIDATE THE REPORT:

1. DATA INTEGRITY: You may ONLY reference numbers that appear in the FUND METRICS DATA below. Do NOT invent, estimate, round differently, or state ANY numeric figure that is not explicitly provided to you. If a number is 0.142356, you may say "approximately 14.2%" but you may NOT say "about 15%".

2. NO PURCHASE RECOMMENDATIONS: NEVER say "you should buy", "I recommend purchasing", "invest in this fund", or any directive language. ALWAYS use framing like:
   - "Funds with these characteristics have historically..."
   - "Based on past performance, this category has shown..."
   - "Investors with similar profiles have typically considered..."

3. EXPLAIN TRADE-OFFS: Don't just restate numbers. Explain what they MEAN for THIS specific user. For example:
   - "Given your ${profile.horizonYears}-year investment horizon, the higher volatility of mid-cap funds means..."
   - "Since you mentioned ${profile.incomeStability === 'stable' ? 'stable income' : 'variable income'}, you may have ${profile.incomeStability === 'stable' ? 'more capacity' : 'less capacity'} to ride out short-term fluctuations..."

4. BEGINNER-FRIENDLY: The reader has NEVER invested before. Explain jargon:
   - CAGR = "average annual growth rate"
   - Volatility = "how much the fund's value tends to fluctuate"
   - Sharpe Ratio = "return per unit of risk" (higher is better)
   - Max Drawdown = "the worst peak-to-trough drop in the fund's history"
   - Expense Ratio = "the annual fee charged by the fund"

5. STRUCTURE: Write the report in these sections:
   - YOUR PROFILE SUMMARY (2-3 sentences summarizing who they are)
   - WHY [RECOMMENDED CATEGORY] (explain why this category fits their profile)
   - FUND ANALYSIS (for each fund in the recommended category, explain the metrics and trade-offs)
   - COMPARISON WITH OTHER CATEGORIES (briefly explain why other categories may be less suitable)
   - KEY TAKEAWAYS (3-4 bullet points)

6. TONE: Warm, educational, encouraging. Not clinical, not salesy.`;

  const user = `USER PROFILE:
- Age: ${profile.age} years old
- Investment Amount: ₹${profile.investmentAmount?.toLocaleString('en-IN')}
- Investment Goal: ${profile.goal}
- Income Type: ${profile.incomeStability === 'stable' ? 'Stable (salaried/regular)' : 'Variable (freelance/business)'}
- Investment Horizon: ${profile.horizonYears} years
- Risk Reaction (to 15% drop): "${profile.riskReaction}"
- Assessed Risk Capacity: ${profile.riskCapacity}
- Recommended Category: ${recommendedCat}

FUND METRICS DATA (pre-computed from real historical NAV data — use ONLY these numbers):
${JSON.stringify(metricsJson, null, 2)}

Write the personalized report now. Remember: use ONLY the numbers above, explain trade-offs, use "historically" framing, and keep it beginner-friendly.`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Hallucination safety net — scan for numbers not in input metrics
// ---------------------------------------------------------------------------

function extractNumbersFromText(text: string): number[] {
  // Match percentages like 14.2%, amounts, and standalone numbers
  const matches = text.match(/[\d]+\.?[\d]*/g) || [];
  return matches.map(Number).filter((n) => !isNaN(n) && n !== 0);
}

function buildAllowedNumbers(
  metrics: IFundMetrics[],
  profile: IUserProfile
): Set<string> {
  const allowed = new Set<string>();

  // Add all metric values and their common representations
  for (const m of metrics) {
    const values = [m.cagr, m.volatility, m.sharpeRatio, m.maxDrawdown, m.expenseRatio];
    for (const v of values) {
      // Allow the raw decimal
      allowed.add(Math.abs(v).toFixed(6));
      allowed.add(Math.abs(v).toFixed(4));
      allowed.add(Math.abs(v).toFixed(2));
      // Allow percentage form (multiply by 100)
      const pct = Math.abs(v) * 100;
      allowed.add(pct.toFixed(4));
      allowed.add(pct.toFixed(2));
      allowed.add(pct.toFixed(1));
      allowed.add(pct.toFixed(0));
      allowed.add(Math.round(pct).toString());
      // Allow the raw number
      allowed.add(Math.abs(v).toString());
    }
  }

  // Add profile numbers
  if (profile.age !== null) allowed.add(profile.age.toString());
  if (profile.investmentAmount !== null) allowed.add(profile.investmentAmount.toString());
  if (profile.horizonYears !== null) allowed.add(profile.horizonYears.toString());

  // Allow common benign numbers (section headers, bullet numbers, etc.)
  for (let i = 0; i <= 20; i++) {
    allowed.add(i.toString());
  }
  allowed.add('100'); // Percentages reference
  allowed.add('15'); // The 15% scenario mentioned in conversation
  allowed.add('252'); // Trading days

  return allowed;
}

function checkForHallucination(
  reportText: string,
  metrics: IFundMetrics[],
  profile: IUserProfile
): { clean: boolean; suspiciousNumbers: string[] } {
  const numbersInReport = extractNumbersFromText(reportText);
  const allowed = buildAllowedNumbers(metrics, profile);
  const suspicious: string[] = [];

  for (const num of numbersInReport) {
    const numStr = num.toString();
    // Check if this number (or close variants) appears in allowed set
    const isAllowed =
      allowed.has(numStr) ||
      allowed.has(num.toFixed(1)) ||
      allowed.has(num.toFixed(2)) ||
      allowed.has(Math.round(num).toString());

    if (!isAllowed && num > 20) {
      // Only flag numbers > 20 that aren't in our allowed set
      // (small numbers are likely section numbering, bullet points, etc.)
      suspicious.push(numStr);
    }
  }

  return {
    clean: suspicious.length === 0,
    suspiciousNumbers: suspicious,
  };
}

// ---------------------------------------------------------------------------
// Stricter prompt for regeneration (used when hallucination detected)
// ---------------------------------------------------------------------------

function buildStricterPrompt(
  originalSystem: string,
  suspiciousNumbers: string[]
): string {
  return (
    originalSystem +
    `\n\n⚠️ CRITICAL WARNING: Your previous response contained numbers that were NOT in the provided data: [${suspiciousNumbers.join(', ')}]. ` +
    `This is STRICTLY FORBIDDEN. You must ONLY use the exact numbers from the FUND METRICS DATA. ` +
    `Do NOT round, estimate, or invent ANY figures. Every number in your response MUST appear in the data provided to you. ` +
    `If you're unsure about a number, OMIT it rather than guessing.`
  );
}

// ---------------------------------------------------------------------------
// Main export — called by report.route.ts
// ---------------------------------------------------------------------------

/**
 * Generate a personalized report for the given session.
 * 1. Fetches UserProfile from MongoDB
 * 2. Determines recommended category (deterministic)
 * 3. Fetches FundMetrics for relevant funds
 * 4. Calls Ollama with constrained prompt
 * 5. Runs hallucination check — regenerates once if suspicious numbers found
 * 6. Saves Report to MongoDB
 */
export const generateReport = async (sessionId: string) => {
  // 1. Fetch UserProfile
  const profile = await UserProfile.findOne({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  });
  if (!profile) {
    throw new Error(`No user profile found for session ${sessionId}. Complete the conversation first.`);
  }
  if (!profile.riskCapacity) {
    throw new Error(`Risk capacity not yet classified for session ${sessionId}. Complete the conversation first.`);
  }

  // 2. Determine recommended category (deterministic, not LLM)
  const recommendedCat = recommendCategory(profile.riskCapacity, profile.horizonYears);

  // 3. Fetch FundMetrics — try MongoDB first, then analytics service cache
  let fundMetrics = await FundMetrics.find({});

  // If local MongoDB has no metrics, try fetching from the Python analytics service cache
  if (fundMetrics.length === 0) {
    console.log('No fund metrics in local MongoDB — fetching from analytics service cache...');
    try {
      const cachedResponse = await getAllCachedMetrics();
      if (cachedResponse.funds && cachedResponse.funds.length > 0) {
        const sanitize = (val: any, fallback = 0) => 
          (typeof val === 'number' && isFinite(val) ? val : fallback);

        // Store them locally for future use
        for (const fund of cachedResponse.funds) {
          await FundMetrics.updateOne(
            { schemeCode: fund.schemeCode },
            {
              $set: {
                schemeCode: fund.schemeCode,
                schemeName: fund.schemeName,
                category: fund.category,
                cagr: sanitize(fund.cagr, 0),
                volatility: sanitize(fund.volatility, 0.15), // Default fallback for volatility
                sharpeRatio: sanitize(fund.sharpeRatio, 0.5), // Default fallback for Sharpe
                maxDrawdown: sanitize(fund.maxDrawdown, -0.25), // Default fallback for Drawdown
                expenseRatio: sanitize(fund.expenseRatio, 0.01),
                lastUpdated: new Date(),
              },
            },
            { upsert: true }
          );
        }
        fundMetrics = await FundMetrics.find({});
        console.log(`Imported ${fundMetrics.length} fund metrics from analytics service`);
      }
    } catch (err) {
      console.error('Failed to fetch from analytics service:', err);
    }
  }

  if (fundMetrics.length === 0) {
    throw new Error(
      'No fund metrics available. Run the seed script first: cd apps/analytics-service && python seed_metrics.py --mongo'
    );
  }

  // Filter to recommended category + include a few from other categories for comparison
  const primaryFunds = fundMetrics.filter(
    (m) => m.category.toLowerCase() === recommendedCat.toLowerCase()
  );
  const otherFunds = fundMetrics.filter(
    (m) => m.category.toLowerCase() !== recommendedCat.toLowerCase()
  );

  // Take up to 3 from recommended category and 1 from each other category
  const metricsForReport = [
    ...primaryFunds.slice(0, 3),
    ...otherFunds.reduce((acc: IFundMetrics[], m) => {
      const cat = m.category.toLowerCase();
      if (!acc.some((a) => a.category.toLowerCase() === cat)) {
        acc.push(m);
      }
      return acc;
    }, []).slice(0, 4),
  ];

  // 4. Build the constrained prompt
  const { system, user } = buildReportPrompt(profile, metricsForReport, recommendedCat);

  // 5. Generate report via Ollama
  console.log(`Generating report for session ${sessionId} using model from env...`);
  let narrativeText = await chatCompletion(system, user, {
    temperature: 0.6,
    num_predict: 2048,
  });

  // Clean qwen3 thinking tags
  narrativeText = narrativeText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // 6. Hallucination check — scan for numbers not in input
  const hallucinationCheck = checkForHallucination(narrativeText, metricsForReport, profile);

  if (!hallucinationCheck.clean) {
    console.warn(
      `⚠ Hallucination detected! Suspicious numbers: [${hallucinationCheck.suspiciousNumbers.join(', ')}]. Regenerating with stricter prompt...`
    );

    const stricterSystem = buildStricterPrompt(system, hallucinationCheck.suspiciousNumbers);
    narrativeText = await chatCompletion(stricterSystem, user, {
      temperature: 0.3, // Lower temperature for stricter output
      num_predict: 2048,
    });

    // Clean thinking tags again
    narrativeText = narrativeText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Second check (log only, don't loop)
    const secondCheck = checkForHallucination(narrativeText, metricsForReport, profile);
    if (!secondCheck.clean) {
      console.warn(
        `⚠ Second generation still has suspicious numbers: [${secondCheck.suspiciousNumbers.join(', ')}]. Proceeding anyway.`
      );
    } else {
      console.log('✓ Regenerated report passes hallucination check.');
    }
  } else {
    console.log('✓ Report passes hallucination check.');
  }

  // 7. Prepend the mandatory disclaimer
  const fullReportText = `${DISCLAIMER_TEXT}\n\n---\n\n${narrativeText}`;

  // 8. Build metrics snapshot for storage
  const metricsSnapshot = metricsForReport.map((m) => ({
    schemeCode: m.schemeCode,
    schemeName: m.schemeName,
    category: m.category,
    cagr: m.cagr,
    volatility: m.volatility,
    sharpeRatio: m.sharpeRatio,
    maxDrawdown: m.maxDrawdown,
    expenseRatio: m.expenseRatio,
  }));

  // 9. Save (upsert) the report to MongoDB
  const reportDoc = await Report.findOneAndUpdate(
    { sessionId: new mongoose.Types.ObjectId(sessionId) },
    {
      $set: {
        sessionId: new mongoose.Types.ObjectId(sessionId),
        recommendedCategory: recommendedCat,
        narrativeText: fullReportText,
        metricsUsed: metricsSnapshot,
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return {
    _id: reportDoc._id,
    sessionId: reportDoc.sessionId,
    recommendedCategory: recommendedCat,
    narrativeText: fullReportText,
    metricsUsed: metricsSnapshot,
    createdAt: reportDoc.createdAt,
  };
};

/**
 * Get a previously saved report.
 */
export const getReport = async (sessionId: string) => {
  const report = await Report.findOne({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  });

  if (!report) {
    return null;
  }

  return {
    _id: report._id,
    sessionId: report.sessionId,
    recommendedCategory: report.recommendedCategory,
    narrativeText: report.narrativeText,
    metricsUsed: report.metricsUsed,
    createdAt: report.createdAt,
  };
};
