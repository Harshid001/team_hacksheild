/**
 * api.ts  — HTTP client for the Node/Express backend
 *
 * All functions are wired to the real API endpoints from MASTER_DOC §6.
 * During demo/mock mode the functions fall back to returning mock data
 * when VITE_USE_MOCK=true (set in .env.local).
 */

import type { Report } from '../../../../packages/shared/src/types'

const BASE = '/api'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || true // default to true for hackathon demo convenience

// ── Session ──────────────────────────────────────────────────────────────────

/**
 * POST /api/conversation/start
 * Creates a new conversation session. Returns sessionId.
 *
 * ⚠️  REAL API CALL — swap mock below with:
 *   const res = await fetch(`${BASE}/conversation/start`, { method:'POST' })
 *   const { sessionId } = await res.json()
 */
export async function startSession(): Promise<string> {
  if (USE_MOCK) {
    await delay(400)
    return `mock-session-${Date.now()}`
  }
  const res = await fetch(`${BASE}/conversation/start`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to start session')
  const { sessionId } = await res.json()
  return sessionId
}

// ── Conversation (REST fallback — WebSocket is preferred path) ───────────────

/**
 * POST /api/conversation/:sessionId/answer
 * Send a user answer. Returns next question and completion flag.
 *
 * ⚠️  REAL API CALL — the WebSocket path in ConversationPage.tsx is preferred.
 *   Use this only as a REST fallback.
 */
export async function sendAnswer(
  sessionId: string,
  answerText: string,
  audioBlob?: Blob
): Promise<{ nextQuestion: string; isComplete: boolean }> {
  if (USE_MOCK) {
    await delay(800)
    // Dynamic question flow based on user keywords to demonstrate adaptiveness
    const lower = answerText.toLowerCase()
    
    if (lower.includes('retire')) {
      return {
        nextQuestion: "Retirement planning is a very common goal. How many years do you have until you plan to retire?",
        isComplete: false
      }
    }
    if (lower.includes('house') || lower.includes('home')) {
      return {
        nextQuestion: "Exciting! A home purchase requires careful timing. When do you hope to buy this house?",
        isComplete: false
      }
    }
    if (lower.includes('risk') || lower.includes('reaction') || lower.includes('panic') || lower.includes('drop')) {
      return {
        nextQuestion: "Got it. How much can you comfortably set aside each month for this goal?",
        isComplete: false
      }
    }
    if (lower.includes('month') || lower.includes('invest') || /\b\d{3,6}\b/.test(lower)) {
      return {
        nextQuestion: "Understood. Finally, do you have any existing mutual funds, stocks, or bank fixed deposits?",
        isComplete: false
      }
    }
    if (lower.includes('yes') || lower.includes('no') || lower.includes('savings') || lower.includes('none')) {
      return {
        nextQuestion: "Thank you. I have enough information to build your profile now!",
        isComplete: true
      }
    }

    // Default progression if no keywords match
    return {
      nextQuestion: "That makes sense. In a bad year, if your investments dropped by 15%, would you: a) Sell everything, b) Do nothing, or c) Buy more?",
      isComplete: false
    }
  }

  const body = audioBlob
    ? (() => { const f = new FormData(); f.append('answerText', answerText); f.append('audio', audioBlob); return f })()
    : JSON.stringify({ answerText })

  const headers: HeadersInit = audioBlob ? {} : { 'Content-Type': 'application/json' }
  const res = await fetch(`${BASE}/conversation/${sessionId}/answer`, {
    method: 'POST', headers, body,
  })
  if (!res.ok) throw new Error('Failed to send answer')
  return res.json()
}

// ── Report ────────────────────────────────────────────────────────────────────

/**
 * POST /api/report/:sessionId/generate
 * Triggers analytics computation + Ollama report composition.
 * Long-running (10-30 s). ProcessingPage polls this.
 */
export async function generateReport(sessionId: string): Promise<Report> {
  if (USE_MOCK) {
    await delay(3000)
    return getMockReport(sessionId)
  }
  const res = await fetch(`${BASE}/report/${sessionId}/generate`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to generate report')
  const { report } = await res.json()
  return report
}

/**
 * GET /api/report/:sessionId
 * Fetch an already-generated report.
 */
export async function fetchReport(sessionId: string): Promise<Report> {
  if (USE_MOCK) {
    await delay(600)
    return getMockReport(sessionId)
  }
  const res = await fetch(`${BASE}/report/${sessionId}`)
  if (!res.ok) throw new Error('Failed to fetch report')
  const { report } = await res.json()
  return report
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export function getMockReport(sessionId: string, overrides?: Partial<Report>): Report {
  return {
    sessionId,
    profileSummary: {
      riskLevel:   'Moderate',
      horizon:     'Long-term',
      goal:        'Wealth Creation',
      headline:    "You're a Moderate-risk, Long-term investor",
      description: "With a balanced risk appetite and a long runway ahead, you're well-placed to build wealth through diversified investing. You don't need the money soon, and you're comfortable seeing some short-term fluctuations.",
      emoji:       '⚖️',
    },
    recommendedFunds: [
      {
        category:    'largeCap',
        categoryName:'Large Cap Equity',
        emoji:       '🏛️',
        description: "India's biggest, most established companies",
        color:       '#1e3a5f',
        riskTag:     'Moderate',
        representativeMetrics: {
          schemeCode: 'avg-largeCap', schemeName: 'Representative Large Cap',
          category: 'largeCap',
          cagr1yr: 14.2, cagr3yr: 13.1, cagr5yr: 12.4, cagr10yr: 11.8,
          volatilityAnnualized: 14.2, sharpeRatio: 0.87,
          maxDrawdown: -28.3, expenseRatio: 1.1, aum: 32000,
          computedAt: new Date().toISOString(),
        },
        topSchemes: [
          { schemeCode: '120503', schemeName: 'Mirae Asset Large Cap Fund', category: 'largeCap', amcName: 'Mirae Asset' },
          { schemeCode: '118834', schemeName: 'Axis Bluechip Fund',         category: 'largeCap', amcName: 'Axis MF'    },
        ],
        aiExplanation: "For someone with your goals and comfort level, funds investing in large, established companies have historically offered a smoother ride. These are India's 'blue-chip' businesses — they're not the fastest growers, but they've proven stable across market cycles. Investors with a long-term horizon in this category saw steady, compounding returns without wild swings.",
        suitabilityScore: 85,
      },
      {
        category:    'hybrid',
        categoryName:'Balanced Hybrid',
        emoji:       '⚖️',
        description: 'Part equity, part debt — best of both worlds',
        color:       '#6d28d9',
        riskTag:     'Moderate',
        representativeMetrics: {
          schemeCode: 'avg-hybrid', schemeName: 'Representative Hybrid',
          category: 'hybrid',
          cagr1yr: 12.1, cagr3yr: 11.3, cagr5yr: 10.8, cagr10yr: 10.2,
          volatilityAnnualized: 10.1, sharpeRatio: 0.92,
          maxDrawdown: -19.4, expenseRatio: 1.2, aum: 18000,
          computedAt: new Date().toISOString(),
        },
        topSchemes: [
          { schemeCode: '100016', schemeName: 'HDFC Balanced Advantage Fund',        category: 'hybrid', amcName: 'HDFC MF'       },
          { schemeCode: '119597', schemeName: 'ICICI Pru Balanced Advantage Fund',   category: 'hybrid', amcName: 'ICICI Pru MF' },
        ],
        aiExplanation: "A balanced hybrid fund holds roughly 40–60% in stocks and the rest in bonds. For your profile — moderate risk, long-term view — this category has historically offered the best risk-adjusted returns, meaning decent growth without the turbulence of a pure equity fund. Think of it as the 'goldilocks' option.",
        suitabilityScore: 90,
      },
      {
        category:    'multiCap',
        categoryName:'Multi Cap Equity',
        emoji:       '🚀',
        description: 'A mix of large, mid, and small companies',
        color:       '#0f766e',
        riskTag:     'Moderately High',
        representativeMetrics: {
          schemeCode: 'avg-multiCap', schemeName: 'Representative Multi Cap',
          category: 'multiCap',
          cagr1yr: 16.8, cagr3yr: 15.4, cagr5yr: 15.1, cagr10yr: 14.3,
          volatilityAnnualized: 18.6, sharpeRatio: 0.81,
          maxDrawdown: -35.1, expenseRatio: 1.5, aum: 12000,
          computedAt: new Date().toISOString(),
        },
        topSchemes: [
          { schemeCode: '125497', schemeName: 'Quant Active Fund', category: 'multiCap', amcName: 'Quant MF' },
          { schemeCode: '100356', schemeName: 'HDFC Multi Cap Fund', category: 'multiCap', amcName: 'HDFC MF' },
        ],
        aiExplanation: "Multi-cap funds spread your money across businesses of all sizes — from giant corporations to growing mid-size companies. This gives you both stability and growth potential. The trade-off: expect more ups and downs than large-cap funds, but historically higher long-term returns over a 7+ year horizon for investors with your profile.",
        suitabilityScore: 75,
      },
    ],
    generatedAt: new Date().toISOString(),
    disclaimer:  'This tool analyzes past performance of publicly available mutual fund data. Past performance does not guarantee future returns. This is an educational tool, not personalized investment advice.',
    ...overrides,
  } as Report
}

/** Conservative short-term mock — used by DemoPage path B */
export function getMockReportConservative(sessionId: string): Report {
  return getMockReport(sessionId, {
    profileSummary: {
      riskLevel: 'Conservative', horizon: 'Short-term', goal: 'Home Purchase',
      headline: "You're a Conservative-risk, Short-term investor",
      description: 'You prefer keeping your money safe, and you need it back relatively soon. Protecting what you have matters most right now.',
      emoji: '🌿',
    },
    recommendedFunds: [
      {
        category: 'liquidFund', categoryName: 'Liquid Fund', emoji: '💧',
        description: 'Park short-term money safely with small returns', color: '#0369a1', riskTag: 'Very Low',
        representativeMetrics: { schemeCode:'avg-liquid', schemeName:'Representative Liquid', category:'liquidFund', cagr1yr:6.2, cagr3yr:5.9, cagr5yr:5.8, cagr10yr:6.1, volatilityAnnualized:0.4, sharpeRatio:1.85, maxDrawdown:-0.3, expenseRatio:0.2, aum:45000, computedAt:new Date().toISOString() },
        topSchemes:[{ schemeCode:'100122', schemeName:'SBI Liquid Fund', category:'liquidFund', amcName:'SBI MF' }],
        aiExplanation: "Think of a liquid fund as a high-interest savings account you can withdraw from almost instantly. It's not designed to grow your wealth — it's designed to keep your emergency fund or short-term savings safe while earning slightly more than a bank account. For your profile, this is ideal for money you might need within 6–12 months.",
        suitabilityScore: 95,
      },
      {
        category: 'debt', categoryName: 'Debt Fund', emoji: '🛡️',
        description: 'Bonds and government securities — lower risk', color: '#0d9488', riskTag: 'Low',
        representativeMetrics: { schemeCode:'avg-debt', schemeName:'Representative Debt', category:'debt', cagr1yr:7.5, cagr3yr:7.1, cagr5yr:7.2, cagr10yr:7.4, volatilityAnnualized:2.8, sharpeRatio:1.21, maxDrawdown:-4.1, expenseRatio:0.5, aum:28000, computedAt:new Date().toISOString() },
        topSchemes:[{ schemeCode:'119551', schemeName:'ICICI Pru Corporate Bond Fund', category:'debt', amcName:'ICICI Pru MF' }],
        aiExplanation: "Debt funds invest in bonds issued by companies and the government — essentially lending money and earning interest. They're designed for capital preservation rather than aggressive growth. Given your profile, including debt exposure acts as a cushion. Historically, these funds have delivered consistent, predictable returns over short-to-medium periods.",
        suitabilityScore: 90,
      },
    ],
  } as Partial<Report>)
}
