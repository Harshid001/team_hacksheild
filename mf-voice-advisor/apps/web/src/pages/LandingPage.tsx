/**
 * LandingPage.tsx — FundWise Marketing & Pitch Page
 *
 * STATIC/STANDALONE — no API calls, no MOCK_MODE.
 * This page is purely presentational and routes into the real app via /start.
 * Primary CTA always goes to /start (DisclaimerPage), never directly to /conversation.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, Legend
} from 'recharts'
import { speak, stopSpeaking } from '../lib/speechSynthesis'
import { TRANSLATIONS } from '../lib/translations'
import { CALC_TRANSLATIONS } from '../lib/calculatorTranslations'

// ─── helpers ─────────────────────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Unused declarations (NAV_DATA, SPARKLINE, MiniSparkline) removed to resolve TS6133 warnings.

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-600 mb-3">
      {children}
    </p>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="font-display font-bold text-2xl text-navy-800 tabular-nums">{value}</div>
      <div className="text-xs text-warm-500 font-medium mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-warm-400">{sub}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English',   native: 'English',    flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi',     native: 'हिंदी',        flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali',   native: 'বাংলা',        flag: '🇧🇩' },
  { code: 'sd', label: 'Sindhi',    native: 'سنڌي',        flag: '🇵🇰' },
  { code: 'ta', label: 'Tamil',     native: 'தமிழ்',       flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',    native: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'ur', label: 'Urdu',      native: 'اردو',        flag: '🇵🇰' },
  { code: 'pa', label: 'Punjabi',   native: 'ਪੰਜਾਬੀ',       flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati',  native: 'ગુજરાતી',     flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',   native: 'ಕನ್ನಡ',        flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം',      flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi',   native: 'मराठी',       flag: '🇮🇳' },
]

type LangCode = 'en'|'hi'|'bn'|'sd'|'ta'|'te'|'ur'|'pa'|'gu'|'kn'|'ml'|'mr'

export default function LandingPage() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // ─── i18n Language States ──────────────────────────────────────────────────
  const [lang, setLang] = useState<LangCode>(() => {
    const saved = localStorage.getItem('pref-lang') as LangCode | null
    return LANGUAGES.some(l => l.code === saved) ? saved! : 'en'
  })
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('pref-lang', lang)
  }, [lang])

  // Close dropdown on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (langRef.current && !langRef.current.contains(e.target as Node)) {
      setLangOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [handleOutsideClick])

  const currentLang = LANGUAGES.find(l => l.code === lang)!

  const t = TRANSLATIONS[lang]

  // ─── Voice Simulator States ────────────────────────────────────────────────
  const [simStep, setSimStep] = useState(0) // 0: idle, 1: welcome, 2: goal chosen, 3: risk chosen
  const [simLogs, setSimLogs] = useState<{ sender: 'bot' | 'user'; text: string }[]>([])
  const [simState, setSimState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')

  // ─── Growth Calculator States ──────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>('Large Cap Equity')
  const [calcType, setCalcType] = useState<'sip' | 'lumpsum'>('sip')
  const [sipMonthly, setSipMonthly] = useState<number>(5000)
  const [calcAmount, setCalcAmount] = useState<number>(50000)
  const [calcPeriod, setCalcPeriod] = useState<number>(5)

  // ─── Metric Explainer States ───────────────────────────────────────────────
  const [activeMetricDetail, setActiveMetricDetail] = useState<string | null>(null)

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  // ─── Voice Simulator Handlers ──────────────────────────────────────────────
  const handleStartSim = () => {
    stopSpeaking()
    setSimStep(1)
    setSimState('speaking')
    const welcomeMsg = lang === 'hi' 
      ? "नमस्ते! मैं आपका फंडवाइज वॉयस एडवाइजर हूँ। चलिए आपकी शैक्षिक रिपोर्ट तैयार करते हैं। आपका मुख्य निवेश लक्ष्य क्या है?"
      : "Hi! I'm your FundWise voice advisor. Let's design your educational report. What is your primary investment goal?"
    setSimLogs([{ sender: 'bot', text: welcomeMsg }])
    speak(welcomeMsg, {
      lang: lang === 'hi' ? 'hi-IN' : 'en-IN',
      onEnd: () => setSimState('listening'),
      onError: () => setSimState('listening')
    })
  }

  const handleSelectGoal = (goal: string) => {
    stopSpeaking()
    const displayGoal = lang === 'hi'
      ? (goal.includes('wealth') || goal.includes('दीर्घकालिक') ? "मेरे दीर्घकालिक धन को बढ़ाएं" : "अल्पकालिक लक्ष्य के लिए बचत")
      : goal
    setSimLogs(prev => [...prev, { sender: 'user', text: displayGoal }])
    setSimState('thinking')
    
    // Simulate thinking delay before advisor speaks
    setTimeout(() => {
      setSimStep(2)
      setSimState('speaking')
      const followUpMsg = lang === 'hi'
        ? "समझ गया। एक स्पष्ट लक्ष्य होने से हमें सही फंड चुनने में मदद मिलती है। बाजार में गिरावट के दौरान क्या आप अपने निवेश में 15 से 20% तक की अस्थायी गिरावट सहन कर सकते हैं?"
        : "Understood. Having a clear goal helps us pick the right asset mix. How comfortable are you with seeing your investments temporarily drop by 15-20% during market dips?"
      setSimLogs(prev => [...prev, { sender: 'bot', text: followUpMsg }])
      speak(followUpMsg, {
        lang: lang === 'hi' ? 'hi-IN' : 'en-IN',
        onEnd: () => setSimState('listening'),
        onError: () => setSimState('listening')
      })
    }, 1000)
  }

  const handleSelectRisk = (risk: string, targetCategory: string) => {
    stopSpeaking()
    const displayRisk = lang === 'hi'
      ? (risk.includes('Low') || risk.includes('कम') ? "कम जोखिम" : risk.includes('Moderate') || risk.includes('मध्यम') ? "मध्यम जोखिम" : "उच्च जोखिम")
      : risk
    setSimLogs(prev => [...prev, { sender: 'user', text: displayRisk }])
    setSimState('thinking')

    const categoryNameTrans = lang === 'hi'
      ? (targetCategory === 'Debt Fund' ? 'डेब्ट फंड (Debt Funds)' : targetCategory === 'Balanced Hybrid' ? 'बैलेंस्ड हाइब्रिड (Balanced Hybrid)' : 'लार्ज कैप इक्विटी (Large Cap Equity)')
      : targetCategory

    setTimeout(() => {
      setSimStep(3)
      setSimState('speaking')
      const resultMsg = lang === 'hi'
        ? `सभी मेट्रिक्स की गणना हो गई है! आपके लक्ष्य और जोखिम प्रोफ़ाइल के आधार पर, मैं आपको ${categoryNameTrans} देखने की सलाह देता हूँ। मैंने नीचे ग्रोथ सिम्युलेटर को अपडेट कर दिया है। इसे देखने के लिए नीचे स्क्रॉल करें!`
        : `All metrics computed! Based on your goal and risk profile, I recommend looking at ${targetCategory}. I've updated the growth simulator below. Scroll down to check it out!`
      setSimLogs(prev => [...prev, { sender: 'bot', text: resultMsg }])
      
      // Auto-update calculator
      setSelectedCategory(targetCategory)
      if (targetCategory === 'Debt Fund') {
        setCalcAmount(100000)
        setCalcPeriod(3)
      } else if (targetCategory === 'Balanced Hybrid') {
        setCalcAmount(150000)
        setCalcPeriod(5)
      } else {
        setCalcAmount(250000)
        setCalcPeriod(7)
      }

      speak(resultMsg, {
        lang: lang === 'hi' ? 'hi-IN' : 'en-IN',
        onEnd: () => setSimState('idle'),
        onError: () => setSimState('idle')
      })
    }, 1200)
  }

  const handleResetSim = () => {
    stopSpeaking()
    setSimStep(0)
    setSimLogs([])
    setSimState('idle')
  }

  // ─── Calculator Logic ──────────────────────────────────────────────────────
  const categoryRates: Record<string, { cagr: number; vol: number; sharpe: number; maxdd: number; expr: number; desc: string }> = {
    'Large Cap Equity': {
      cagr: 0.142,
      vol: 0.165,
      sharpe: 0.85,
      maxdd: -32.0,
      expr: 1.10,
      desc: "Top 100 blue-chip companies. High long-term compounding, but volatile during market drops."
    },
    'Balanced Hybrid': {
      cagr: 0.115,
      vol: 0.112,
      sharpe: 0.90,
      maxdd: -18.0,
      expr: 1.35,
      desc: "Spreads investments between equity and debt. Smooths out volatility while growing capital."
    },
    'Debt Fund': {
      cagr: 0.068,
      vol: 0.035,
      sharpe: 1.10,
      maxdd: -4.0,
      expr: 0.65,
      desc: "Invests in high-rated corporate bonds and gov security. Very stable, minimal risk."
    }
  }

  const generateDynamicChartData = () => {
    const data = []
    const months = calcPeriod * 12
    const step = Math.max(1, Math.round(months / 10)) // ~10 points on chart
    
    for (let m = 0; m <= months; m += step) {
      const years = m / 12
      // e.g. "Yr 1.5" or "Yr 3"
      const label = `Yr ${years.toFixed(years % 1 === 0 ? 0 : 1)}`
      const row: any = { period: label }
      
      Object.keys(categoryRates).forEach(cat => {
        const rate = categoryRates[cat].cagr
        if (calcType === 'sip') {
          const i = rate / 12
          if (m === 0) {
            row[cat === 'Large Cap Equity' ? 'largeCap' : cat === 'Balanced Hybrid' ? 'hybrid' : 'debt'] = sipMonthly
          } else {
            row[cat === 'Large Cap Equity' ? 'largeCap' : cat === 'Balanced Hybrid' ? 'hybrid' : 'debt'] = 
              Math.round(sipMonthly * (((Math.pow(1 + i, m) - 1) / i) * (1 + i)))
          }
        } else {
          row[cat === 'Large Cap Equity' ? 'largeCap' : cat === 'Balanced Hybrid' ? 'hybrid' : 'debt'] = 
            Math.round(calcAmount * Math.pow(1 + rate, years))
        }
      })
      
      data.push(row)
    }
    return data
  }

  const chartData = generateDynamicChartData()

  const renderFormattedText = (text: string, categoryKey: 'nameLargeCap' | 'nameHybrid' | 'nameDebt', rateStr: string) => {
    const categoryTrans = CALC_TRANSLATIONS[lang]?.[categoryKey] || (categoryKey === 'nameLargeCap' ? 'Large Cap Equity' : categoryKey === 'nameHybrid' ? 'Balanced Hybrid' : 'Debt Fund');
    let replaced = text
      .replace('{category}', categoryTrans)
      .replace('{rate}', rateStr);
    const parts = replaced.split(/\*\*([^*]+)\*\*/g);
    return (
      <span>
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            return <strong key={index}>{part}</strong>;
          }
          return part;
        })}
      </span>
    );
  };

  // Calculate results for selected category
  const activeRate = categoryRates[selectedCategory].cagr
  const totalInvested = calcType === 'sip' ? sipMonthly * calcPeriod * 12 : calcAmount
  const futureValue = calcType === 'sip' 
    ? Math.round(sipMonthly * (((Math.pow(1 + (activeRate / 12), calcPeriod * 12) - 1) / (activeRate / 12)) * (1 + (activeRate / 12))))
    : Math.round(calcAmount * Math.pow(1 + activeRate, calcPeriod))
  const estimatedReturns = Math.max(0, futureValue - totalInvested)

  return (
    <div className="min-h-screen bg-white text-navy-800 selection:bg-teal-100">

      {/* ════════════════════════════════════════════════════════════
          NAV BAR
      ════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-warm-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-700 to-teal-600 flex items-center justify-center shadow">
              <span className="text-white font-display font-bold text-sm">F</span>
            </div>
            <span className="font-display font-bold text-lg text-navy-800">FundWise</span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-warm-600">
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-navy-800 transition-colors">
              {t.navHowItWorks}
            </button>
            <button onClick={() => scrollTo('integrity')} className="hover:text-navy-800 transition-colors">
              {t.navIntegrity}
            </button>
            <button onClick={() => scrollTo('trust')} className="hover:text-navy-800 transition-colors">
              {t.navTrust}
            </button>
          </nav>

          {/* Language selector & CTA */}
          <div className="flex items-center gap-3">
            {/* ── Language Dropdown ── */}
            <div ref={langRef} className="relative">
              <button
                id="lang-dropdown-btn"
                onClick={() => setLangOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warm-300 text-xs font-semibold text-warm-600 hover:text-navy-800 hover:border-navy-400 bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 select-none"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label="Select language"
              >
                <svg className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>{currentLang.flag} {currentLang.native}</span>
                <svg
                  className={`w-3 h-3 text-warm-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {langOpen && (
                <div
                  role="listbox"
                  aria-label="Language options"
                  className="absolute right-0 mt-1.5 w-48 bg-white border border-warm-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden"
                  style={{ animation: 'fadeSlideDown 0.15s ease' }}
                >
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      role="option"
                      aria-selected={lang === l.code}
                      onClick={() => {
                        setLang(l.code as LangCode)
                        setLangOpen(false)
                        handleResetSim()
                      }}
                      className={`w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                        lang === l.code
                          ? 'bg-teal-50 text-teal-700 font-semibold'
                          : 'text-warm-700 hover:bg-warm-50 font-medium'
                      }`}
                    >
                      <span className="text-base leading-none">{l.flag}</span>
                      <span className="flex-1">{l.native}</span>
                      <span className="text-warm-400">{l.label}</span>
                      {lang === l.code && (
                        <svg className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/start"
              className="flex-shrink-0 btn-primary py-2 px-5 text-sm rounded-lg"
            >
              {t.navStartButton}
            </Link>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-teal-900 text-white pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left column */}
          <div className="lg:col-span-6 space-y-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-400/10 border border-teal-400/30 text-teal-300 text-xs font-semibold tracking-wide mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                {t.heroBadge}
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-display font-bold leading-[1.12] tracking-tight text-white">
                {t.heroTitlePart1}<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-teal-400">
                  {t.heroTitlePart2}
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-navy-200 leading-relaxed max-w-xl">
                {t.heroSub}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/start" className="btn-primary text-base px-7 py-3.5 shadow-xl shadow-teal-900/40">
                {t.heroCtaStart}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white text-base font-medium hover:bg-white/10 transition-colors"
              >
                {t.heroCtaSeeHow}
              </button>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-6 pt-2"
            >
              <div className="flex items-center gap-2 text-navy-300 text-xs">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {t.heroTrustEducational}
              </div>
              <div className="flex items-center gap-2 text-navy-300 text-xs">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t.heroTrustMetrics}
              </div>
              <div className="flex items-center gap-2 text-navy-300 text-xs">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t.heroTrustNoTx}
              </div>
            </motion.div>
          </div>

          {/* Right column — Interactive Voice Advisor Simulator */}
          <div className="lg:col-span-6 flex flex-col items-center justify-start pt-4 lg:pt-0 w-full min-h-[460px] relative z-20">
            {/* Glow backdrop */}
            <div className="absolute -z-10 w-80 h-80 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

            {simStep === 0 ? (
              // ─── STEP 0: IDLE STATE ───
              <div className="flex flex-col items-center justify-center space-y-6 text-center py-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartSim}
                  className="relative group focus:outline-none focus:ring-4 focus:ring-teal-500/30 rounded-full"
                  aria-label="Click to start voice simulation demo"
                >
                  {/* Outer breathing ring */}
                  <div className="absolute -inset-4 rounded-full bg-teal-500/10 group-hover:bg-teal-500/20 blur-md transition-all duration-300" />
                  
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-teal-400/20 to-navy-600/20 border border-teal-400/30 flex items-center justify-center transition-all duration-300 group-hover:border-teal-400/50">
                    <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/40 orb-idle group-hover:from-teal-400 group-hover:to-teal-500">
                      <svg className="w-12 h-12 text-white group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                  </div>

                  {/* Floating label on the orb */}
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-teal-400 to-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border border-teal-300/30 tracking-wider uppercase">
                    {t.heroOrbBadge}
                  </div>
                </motion.button>

                <div className="space-y-2 max-w-sm">
                  <h3 className="font-display font-semibold text-lg text-white">{t.heroOrbTryTitle}</h3>
                  <p className="text-sm text-navy-200">
                    {t.heroOrbTrySub}
                  </p>
                </div>

                <button 
                  onClick={handleStartSim}
                  className="btn-primary text-sm px-6 py-3 font-semibold shadow-lg shadow-teal-900/40 rounded-xl"
                >
                  {t.heroOrbTryBtn}
                </button>
              </div>
            ) : (
              // ─── STEP 1-3: ACTIVE SIMULATOR CONSOLE ───
              <div className="w-full max-w-md bg-navy-950/85 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col justify-between h-[450px]">
                
                {/* Header info */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    {/* Pulsing Orb status */}
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg ${
                        simState === 'listening' ? 'orb-listen' : simState === 'speaking' ? 'orb-speak' : 'orb-idle'
                      }`}>
                        {simState === 'listening' ? (
                          <div className="flex items-center gap-0.5 justify-center">
                            <span className="wave-bar h-3" />
                            <span className="wave-bar h-4" />
                            <span className="wave-bar h-3" />
                          </div>
                        ) : (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-teal-400 block tracking-wide uppercase">{t.simTitle}</span>
                      <span className="text-[10px] text-navy-300 flex items-center gap-1">
                        {simState === 'speaking' ? t.simSpeaking : simState === 'listening' ? t.simListening : simState === 'thinking' ? t.simAnalyzing : t.simConnected}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={handleResetSim}
                    className="text-[11px] text-navy-300 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-colors"
                  >
                    {t.simReset}
                  </button>
                </div>

                {/* Message Log Area */}
                <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1 scrollbar-thin">
                  {simLogs.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                        log.sender === 'user'
                          ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-tr-none'
                          : 'bg-navy-800 text-navy-100 border border-white/5 rounded-tl-none'
                      }`}>
                        {log.text}
                      </div>
                    </motion.div>
                  ))}

                  {simState === 'thinking' && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex justify-start"
                    >
                      <div className="bg-navy-800 border border-white/5 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Interactive Action Options */}
                <div className="pt-3 border-t border-white/5 min-h-[90px] flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {simState === 'listening' && simStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="grid grid-cols-1 gap-2"
                      >
                        {t.simOptionsGoal.map((opt: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => handleSelectGoal(opt.value)}
                            className="w-full text-left text-xs bg-navy-800 hover:bg-navy-700 text-white border border-white/10 hover:border-teal-400/40 rounded-xl px-4 py-2.5 transition-all"
                          >
                            {opt.text}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {simState === 'listening' && simStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                      >
                        {t.simOptionsRisk.map((opt: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => handleSelectRisk(opt.value, opt.category)}
                            className="text-center text-xs bg-navy-800 hover:bg-navy-700 text-white border border-white/10 hover:border-teal-400/40 rounded-xl p-2 transition-all"
                          >
                            {opt.text}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {simStep === 3 && simState !== 'thinking' && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex flex-col gap-2 w-full"
                      >
                        <button
                          onClick={() => scrollTo('growth-simulator')}
                          className="w-full text-center text-xs bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl py-3 shadow-lg shadow-teal-900/20"
                        >
                          {t.simCalcBtn}
                        </button>
                        <button
                          onClick={handleResetSim}
                          className="w-full text-center text-[11px] text-navy-400 hover:text-white"
                        >
                          {t.simBackBtn}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {simState === 'speaking' && (
                    <motion.div
                      key="speaking-prompt"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-xs text-teal-300 italic"
                    >
                      {t.simListenPrompt}
                    </motion.div>
                  )}

                  {simState === 'thinking' && (
                    <motion.div
                      key="thinking-prompt"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-xs text-navy-400"
                    >
                      {t.simThinkingPrompt}
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════════════════════════
          STAT STRIP
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-warm-200">
          <Stat label={t.statCategories} value="6+" />
          <Stat label={t.statPoints} value="10Y+" />
          <Stat label={t.statMetrics} value="5" sub="CAGR • Vol • Sharpe • MaxDD • Exp.R" />
          <Stat label={t.statAdapts} value={t.statAdaptsVal} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PERFORMANCE CHART (Recharts)
      ════════════════════════════════════════════════════════════ */}
      <section id="growth-simulator" className="py-20 bg-warm-50 border-b border-warm-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-10">
              <SectionLabel>{t.calcSectionLabel}</SectionLabel>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-navy-800 mb-3">
                {t.calcTitle}
              </h2>
              <p className="text-sm text-warm-600 max-w-xl mx-auto">
                {t.calcSub}
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="bg-white rounded-2xl border border-warm-200 shadow-xl overflow-hidden grid lg:grid-cols-12 gap-0">
              
              {/* Left Column — Controls & Summary */}
              <div className="lg:col-span-5 p-6 sm:p-8 bg-warm-50/50 border-r border-warm-200 flex flex-col justify-between space-y-6">
                
                {/* 1. Category Tabs */}
                <div>
                  <label className="text-xs font-bold text-navy-900 uppercase tracking-wider block mb-3">
                    {t.calcLabelCategory}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-warm-200/50 rounded-xl border border-warm-200">
                    {Object.keys(categoryRates).map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat)
                          setActiveMetricDetail(null)
                        }}
                        className={`text-[10px] sm:text-xs font-semibold py-2.5 rounded-lg transition-all ${
                          selectedCategory === cat
                            ? 'bg-white text-navy-800 shadow-sm border border-warm-300/30'
                            : 'text-warm-600 hover:text-navy-800'
                        }`}
                      >
                        {cat === 'Large Cap Equity' 
                          ? (CALC_TRANSLATIONS[lang]?.catLargeCap || '🏛️ Large Cap') 
                          : cat === 'Balanced Hybrid' 
                            ? (CALC_TRANSLATIONS[lang]?.catHybrid || '⚖️ Hybrid') 
                            : (CALC_TRANSLATIONS[lang]?.catDebt || '🛡️ Debt')}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-warm-500 mt-2 italic leading-relaxed">
                    {selectedCategory === 'Large Cap Equity'
                      ? (CALC_TRANSLATIONS[lang]?.descLargeCap || categoryRates[selectedCategory].desc)
                      : selectedCategory === 'Balanced Hybrid'
                        ? (CALC_TRANSLATIONS[lang]?.descHybrid || categoryRates[selectedCategory].desc)
                        : (CALC_TRANSLATIONS[lang]?.descDebt || categoryRates[selectedCategory].desc)
                    }
                  </p>
                </div>

                {/* 2. SIP vs Lumpsum Toggle */}
                <div>
                  <label className="text-xs font-bold text-navy-900 uppercase tracking-wider block mb-3">
                    {t.calcLabelMethod}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCalcType('sip')}
                      className={`flex-1 font-semibold text-xs py-2 rounded-lg border transition-all ${
                        calcType === 'sip'
                          ? 'bg-navy-800 text-white border-navy-800'
                          : 'bg-white text-warm-600 border-warm-200 hover:text-navy-800'
                      }`}
                    >
                      {t.calcLabelSip}
                    </button>
                    <button
                      onClick={() => setCalcType('lumpsum')}
                      className={`flex-1 font-semibold text-xs py-2 rounded-lg border transition-all ${
                        calcType === 'lumpsum'
                          ? 'bg-navy-800 text-white border-navy-800'
                          : 'bg-white text-warm-600 border-warm-200 hover:text-navy-800'
                      }`}
                    >
                      {t.calcLabelLumpsum}
                    </button>
                  </div>
                </div>

                {/* 3. Inputs Sliders */}
                <div className="space-y-4">
                  {calcType === 'sip' ? (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-warm-600">{t.calcSipAmt}</label>
                        <span className="font-display font-bold text-sm text-navy-800">₹{sipMonthly.toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="50000"
                        step="1000"
                        value={sipMonthly}
                        onChange={(e) => setSipMonthly(Number(e.target.value))}
                        className="w-full h-1 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                      <div className="flex justify-between text-[9px] text-warm-400 mt-1">
                        <span>₹1,000</span>
                        <span>₹50,000</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-warm-600">{t.calcLumpAmt}</label>
                        <span className="font-display font-bold text-sm text-navy-800">₹{calcAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="1000000"
                        step="10000"
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(Number(e.target.value))}
                        className="w-full h-1 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                      <div className="flex justify-between text-[9px] text-warm-400 mt-1">
                        <span>₹10,000</span>
                        <span>₹10L</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-warm-600">{t.calcPeriod}</label>
                      <span className="font-display font-bold text-sm text-navy-800">{calcPeriod} {calcPeriod === 1 ? t.calcPeriodYear : t.calcPeriodYears}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={calcPeriod}
                      onChange={(e) => setCalcPeriod(Number(e.target.value))}
                      className="w-full h-1 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <div className="flex justify-between text-[9px] text-warm-400 mt-1">
                      <span>1 {t.calcPeriodYear}</span>
                      <span>15 {t.calcPeriodYears}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Live Calculator Results */}
                <div className="bg-navy-950 text-white rounded-xl p-4 border border-white/5 space-y-3.5 shadow-inner">
                  <div className="flex justify-between text-[11px] text-navy-300">
                    <span>{t.calcInvested}</span>
                    <span className="tabular-nums font-semibold">₹{totalInvested.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-navy-300">
                    <span>{t.calcReturns}</span>
                    <span className="tabular-nums font-semibold text-teal-400">
                      +₹{estimatedReturns.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-2.5 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">{t.calcFutureVal}</span>
                    <span className="font-display font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-200 tabular-nums">
                      ₹{futureValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Column — Area Chart & Risk Metric Cards */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                
                {/* Dynamic Area Chart */}
                <div className="h-64 sm:h-72 w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gLC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1e3a5f" stopOpacity={selectedCategory === 'Large Cap Equity' ? 0.22 : 0.05} />
                          <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gHY" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#7c3aed" stopOpacity={selectedCategory === 'Balanced Hybrid' ? 0.20 : 0.05} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDT" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#0d9488" stopOpacity={selectedCategory === 'Debt Fund' ? 0.22 : 0.05} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ede9e3" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#b0a697' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#b0a697' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                        width={46}
                      />
                      <ChartTooltip
                        contentStyle={{ background: '#fff', border: '1px solid #ede9e3', borderRadius: 12, fontSize: 11 }}
                        formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`]}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6b6159' }} />
                      <Area
                        type="monotone"
                        name="Large Cap Equity"
                        dataKey="largeCap"
                        stroke="#1e3a5f"
                        strokeWidth={selectedCategory === 'Large Cap Equity' ? 3.5 : 1.2}
                        fill="url(#gLC)"
                        dot={false}
                        activeDot={selectedCategory === 'Large Cap Equity' ? { r: 5 } : false}
                        opacity={selectedCategory === 'Large Cap Equity' ? 1.0 : 0.35}
                      />
                      <Area
                        type="monotone"
                        name="Balanced Hybrid"
                        dataKey="hybrid"
                        stroke="#7c3aed"
                        strokeWidth={selectedCategory === 'Balanced Hybrid' ? 3.5 : 1.2}
                        fill="url(#gHY)"
                        dot={false}
                        activeDot={selectedCategory === 'Balanced Hybrid' ? { r: 5 } : false}
                        opacity={selectedCategory === 'Balanced Hybrid' ? 1.0 : 0.35}
                      />
                      <Area
                        type="monotone"
                        name="Debt Fund"
                        dataKey="debt"
                        stroke="#0d9488"
                        strokeWidth={selectedCategory === 'Debt Fund' ? 3.5 : 1.2}
                        fill="url(#gDT)"
                        dot={false}
                        activeDot={selectedCategory === 'Debt Fund' ? { r: 5 } : false}
                        opacity={selectedCategory === 'Debt Fund' ? 1.0 : 0.35}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Risk Metric Grid (Interactive Cards) */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-navy-900 uppercase tracking-widest block">
                      {t.calcMetricsLabel}
                    </label>
                    <span className="text-[9px] text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                      {t.calcMetricsBadge}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { l: t.metricCagr, v: `${(categoryRates[selectedCategory].cagr * 100).toFixed(1)}%`, id: 'cagr' },
                      { l: t.metricVol, v: `${(categoryRates[selectedCategory].vol * 100).toFixed(1)}%`, id: 'vol' },
                      { l: t.metricSharpe, v: categoryRates[selectedCategory].sharpe.toFixed(2), id: 'sharpe' },
                      { l: t.metricMaxdd, v: `${categoryRates[selectedCategory].maxdd}%`, id: 'maxdd' },
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setActiveMetricDetail(activeMetricDetail === m.id ? null : m.id)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          activeMetricDetail === m.id
                            ? 'bg-teal-50 border-teal-300 shadow-sm scale-102 ring-2 ring-teal-500/20'
                            : 'bg-warm-50/50 hover:bg-warm-100/50 border-warm-200'
                        }`}
                      >
                        <p className="text-[9px] uppercase tracking-wider text-warm-500 font-bold">{m.l}</p>
                        <p className="font-display font-extrabold text-base text-navy-800 mt-1 tabular-nums">
                          {m.v}
                        </p>
                        <span className="text-[8px] text-teal-600 mt-1 block font-semibold hover:underline">
                          {activeMetricDetail === m.id ? t.calcCloseInfo : t.calcWhatIsThis}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Active Metric Description Panel */}
                  <AnimatePresence>
                    {activeMetricDetail && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900 leading-relaxed"
                      >
                        {activeMetricDetail === 'cagr' && (
                          <p>
                            {renderFormattedText(
                              CALC_TRANSLATIONS[lang]?.explainCagr || CALC_TRANSLATIONS['en'].explainCagr,
                              selectedCategory === 'Large Cap Equity' ? 'nameLargeCap' : selectedCategory === 'Balanced Hybrid' ? 'nameHybrid' : 'nameDebt',
                              (categoryRates[selectedCategory].cagr * 100).toFixed(1)
                            )}
                          </p>
                        )}
                        {activeMetricDetail === 'vol' && (
                          <p>
                            {renderFormattedText(
                              CALC_TRANSLATIONS[lang]?.explainVol || CALC_TRANSLATIONS['en'].explainVol,
                              selectedCategory === 'Large Cap Equity' ? 'nameLargeCap' : selectedCategory === 'Balanced Hybrid' ? 'nameHybrid' : 'nameDebt',
                              (categoryRates[selectedCategory].vol * 100).toFixed(1)
                            )}
                          </p>
                        )}
                        {activeMetricDetail === 'sharpe' && (
                          <p>
                            {renderFormattedText(
                              CALC_TRANSLATIONS[lang]?.explainSharpe || CALC_TRANSLATIONS['en'].explainSharpe,
                              selectedCategory === 'Large Cap Equity' ? 'nameLargeCap' : selectedCategory === 'Balanced Hybrid' ? 'nameHybrid' : 'nameDebt',
                              categoryRates[selectedCategory].sharpe.toFixed(2)
                            )}
                          </p>
                        )}
                        {activeMetricDetail === 'maxdd' && (
                          <p>
                            {renderFormattedText(
                              CALC_TRANSLATIONS[lang]?.explainMaxdd || CALC_TRANSLATIONS['en'].explainMaxdd,
                              selectedCategory === 'Large Cap Equity' ? 'nameLargeCap' : selectedCategory === 'Balanced Hybrid' ? 'nameHybrid' : 'nameDebt',
                              categoryRates[selectedCategory].maxdd.toString()
                            )}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

            </div>
          </FadeUp>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          THE PROBLEM
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-b border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <SectionLabel>{t.problemSectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-navy-800">
              {t.problemTitle}
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {t.problems.map((item: any, i: number) => (
              <FadeUp key={item.title} delay={i * 0.1}>
                <div className="feature-card">
                  <span className="text-3xl" aria-hidden>{item.icon}</span>
                  <h3 className="font-display font-semibold text-navy-800 text-base">{item.title}</h3>
                  <p className="text-sm text-warm-600 leading-relaxed flex-1">{item.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 bg-warm-50 border-b border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-14">
            <SectionLabel>{t.processSectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-navy-800">
              {t.processTitle}
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-9 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-warm-200 z-0" />

            {[
              { step: '01', color: 'from-navy-700 to-navy-600' },
              { step: '02', color: 'from-teal-600 to-teal-700' },
              { step: '03', color: 'from-violet-600 to-violet-700' },
            ].map((meta, i) => {
              const item = t.processes[i]
              return (
                <FadeUp key={meta.step} delay={i * 0.15} className="relative z-10">
                  <div className="flex flex-col gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-md`}>
                      <span className="font-display font-bold text-white text-lg">{meta.step}</span>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-navy-800 text-lg mb-2">{item.title}</h3>
                      <p className="text-sm text-warm-600 leading-relaxed">{item.body}</p>
                      <p className="mt-3 text-[10px] font-semibold text-teal-600 uppercase tracking-widest">{item.tag}</p>
                    </div>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          DATA INTEGRITY
      ════════════════════════════════════════════════════════════ */}
      <section id="integrity" className="py-20 bg-white border-b border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <SectionLabel>{t.integritySectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-navy-800 mb-3">
              {t.integrityTitle}
            </h2>
            <p className="text-sm text-warm-600 max-w-xl mx-auto">
              {t.integritySub}
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {/* Computed Data card */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="badge-computed py-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                    </svg>
                    {t.integrityBadgeComputed}
                  </span>
                  <span className="text-[10px] text-blue-500 font-medium">{t.integritySource}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: t.integrityLabelCagr, v: '14.2%' },
                    { l: t.integrityLabelVol, v: t.integrityVolVal },
                    { l: t.integrityLabelSharpe, v: '0.87' },
                    { l: t.integrityLabelMaxdd, v: '-28.3%' },
                    { l: t.integrityLabelExpr, v: '1.1%' },
                    { l: t.integrityLabelAum, v: t.integrityLabelAumVal },
                  ].map(m => (
                    <div key={m.l} className="bg-white rounded-xl px-3 py-2 border border-blue-100">
                      <p className="text-[9px] uppercase tracking-wider text-blue-400 font-semibold">{m.l}</p>
                      <p className="font-display font-bold text-navy-800 tabular-nums mt-0.5">{m.v}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-600 font-medium">{t.integrityTickComputed}</p>
              </div>

              {/* AI Explanation card */}
              <div className="bg-violet-50/50 border border-violet-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="badge-ai py-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    {t.integrityBadgeAi}
                  </span>
                  <span className="text-[10px] text-violet-500 font-medium">{t.integritySourceAi}</span>
                </div>
                <div className="bg-white border border-violet-100 rounded-xl p-4">
                  <p className="text-sm text-navy-700 leading-relaxed">
                    {t.integrityAiQuote}
                  </p>
                </div>
                <p className="text-xs text-violet-600 font-medium">{t.integrityTickExplanation}</p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          TRUST & SAFETY
      ════════════════════════════════════════════════════════════ */}
      <section id="trust" className="py-20 bg-warm-50 border-b border-warm-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-10">
            <SectionLabel>{t.integritySectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-navy-800">
              {t.trustTitle}
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2.5 text-amber-700">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="font-display font-semibold text-base">{t.trustBadge}</h3>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed font-medium">
                {t.trustDisclaimer}
              </p>
              <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-amber-200">
                {t.trustItems.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-1.5">
                    <span className="text-xl" aria-hidden>{item.icon}</span>
                    <p className="text-xs font-semibold text-amber-800">{item.title}</p>
                    <p className="text-xs text-amber-700 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24 sm:py-32 bg-gradient-to-br from-navy-900 via-navy-800 to-teal-900 text-white">
        <div className="absolute pointer-events-none inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <FadeUp>
            <p className="text-teal-300 text-sm font-semibold uppercase tracking-widest mb-3">{t.ctaSectionLabel}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight">
              {t.ctaTitle}
            </h2>
            <p className="mt-4 text-navy-300 max-w-lg mx-auto text-base leading-relaxed">
              {t.ctaSub}
            </p>
          </FadeUp>
          <FadeUp delay={0.15}>
            <Link to="/start" className="btn-primary text-base px-8 py-4 shadow-xl shadow-teal-900/40">
              {t.ctaButton}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <p className="mt-4 text-xs text-navy-400">{t.ctaFooterInfo}</p>
          </FadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-navy-950 text-center">
        <p className="text-xs text-navy-500">
          {t.footerCopy}
        </p>
      </footer>

    </div>
  )
}
