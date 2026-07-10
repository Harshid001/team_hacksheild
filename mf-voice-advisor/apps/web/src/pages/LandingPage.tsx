import { useRef, useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, Legend
} from 'recharts'
import { TRANSLATIONS } from '../lib/translations'
import { CALC_TRANSLATIONS } from '../lib/calculatorTranslations'
import { useTranslation } from '../context/TranslationContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ProfileDropdown from '../components/ProfileDropdown'

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
    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600 mb-3">
      {children}
    </p>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="font-display font-bold text-2xl text-slate-800 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
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
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

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



  // ─── Growth Calculator States ──────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>('Large Cap Equity')
  const [calcType, setCalcType] = useState<'sip' | 'lumpsum'>('sip')
  const [sipMonthly, setSipMonthly] = useState<number>(5000)
  const [calcAmount, setCalcAmount] = useState<number>(50000)
  const [calcPeriod, setCalcPeriod] = useState<number>(5)

  // ─── Metric Explainer States ───────────────────────────────────────────────
  const [activeMetricDetail, setActiveMetricDetail] = useState<string | null>(null)





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
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 selection:bg-blue-100 dark:selection:bg-blue-900/50">

      {/* ════════════════════════════════════════════════════════════
          NAV BAR
      ════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Profile Logo & Wordmark */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ProfileDropdown onLoginClick={() => navigate('/signup')} />
            <span className="font-display font-bold text-lg text-slate-800 dark:text-white">MF Advisor</span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-slate-800 dark:hover:text-white transition-colors">
              {t.navHowItWorks}
            </button>
            <button onClick={() => scrollTo('integrity')} className="hover:text-slate-800 dark:hover:text-white transition-colors">
              {t.navIntegrity}
            </button>
            <button onClick={() => scrollTo('trust')} className="hover:text-slate-800 dark:hover:text-white transition-colors">
              {t.navTrust}
            </button>
          </nav>

          {/* Language selector & CTA */}
          <div className="flex items-center gap-3">
            
            {/* ── Theme Toggle ── */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {/* ── Language Dropdown ── */}
            <div ref={langRef} className="relative">
              <button
                id="lang-dropdown-btn"
                onClick={() => setLangOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 select-none"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label="Select language"
              >
                <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>{currentLang.flag} {currentLang.native}</span>
                <svg
                  className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
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
                  className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden"
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
                      }}
                      className={`w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                        lang === l.code
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <span className="text-base leading-none">{l.flag}</span>
                      <span className="flex-1">{l.native}</span>
                      <span className="text-gray-400">{l.label}</span>
                      {lang === l.code && (
                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          {/* Main content */}
          <div className="max-w-3xl mx-auto space-y-7 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {t.heroBadge}
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-display font-bold leading-[1.12] tracking-tight text-white">
                {t.heroTitlePart1}<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-400">
                  {t.heroTitlePart2}
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
                {t.heroSub}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link to="/start" className="btn-primary text-base px-7 py-3.5 shadow-xl shadow-blue-900/40">
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
              className="flex flex-wrap justify-center items-center gap-6 pt-2"
            >
              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {t.heroTrustEducational}
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t.heroTrustMetrics}
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t.heroTrustNoTx}
              </div>
            </motion.div>
          </div>


        </div>
      </section>


      {/* ════════════════════════════════════════════════════════════
          STAT STRIP
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-200">
          <Stat label={t.statCategories} value="6+" />
          <Stat label={t.statPoints} value="10Y+" />
          <Stat label={t.statMetrics} value="5" sub="CAGR • Vol • Sharpe • MaxDD • Exp.R" />
          <Stat label={t.statAdapts} value={t.statAdaptsVal} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PERFORMANCE CHART (Recharts)
      ════════════════════════════════════════════════════════════ */}
      <section id="growth-simulator" className="py-20 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-10">
              <SectionLabel>{t.calcSectionLabel}</SectionLabel>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-slate-800 mb-3">
                {t.calcTitle}
              </h2>
              <p className="text-sm text-gray-600 max-w-xl mx-auto">
                {t.calcSub}
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden grid lg:grid-cols-12 gap-0">
              
              {/* Left Column — Controls & Summary */}
              <div className="lg:col-span-5 p-6 sm:p-8 bg-gray-50/50 border-r border-gray-200 flex flex-col justify-between space-y-6">
                
                {/* 1. Category Tabs */}
                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                    {t.calcLabelCategory}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-200/50 rounded-xl border border-gray-200">
                    {Object.keys(categoryRates).map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat)
                          setActiveMetricDetail(null)
                        }}
                        className={`text-[10px] sm:text-xs font-semibold py-2.5 rounded-lg transition-all ${
                          selectedCategory === cat
                            ? 'bg-white text-slate-800 shadow-sm border border-gray-300/30'
                            : 'text-gray-600 hover:text-slate-800'
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
                  <p className="text-[11px] text-gray-500 mt-2 italic leading-relaxed">
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
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                    {t.calcLabelMethod}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCalcType('sip')}
                      className={`flex-1 font-semibold text-xs py-2 rounded-lg border transition-all ${
                        calcType === 'sip'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:text-slate-800'
                      }`}
                    >
                      {t.calcLabelSip}
                    </button>
                    <button
                      onClick={() => setCalcType('lumpsum')}
                      className={`flex-1 font-semibold text-xs py-2 rounded-lg border transition-all ${
                        calcType === 'lumpsum'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:text-slate-800'
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
                        <label className="text-xs font-semibold text-gray-600">{t.calcSipAmt}</label>
                        <span className="font-display font-bold text-sm text-slate-800">₹{sipMonthly.toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="50000"
                        step="1000"
                        value={sipMonthly}
                        onChange={(e) => setSipMonthly(Number(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                        <span>₹1,000</span>
                        <span>₹50,000</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-gray-600">{t.calcLumpAmt}</label>
                        <span className="font-display font-bold text-sm text-slate-800">₹{calcAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="1000000"
                        step="10000"
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(Number(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                        <span>₹10,000</span>
                        <span>₹10L</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-gray-600">{t.calcPeriod}</label>
                      <span className="font-display font-bold text-sm text-slate-800">{calcPeriod} {calcPeriod === 1 ? t.calcPeriodYear : t.calcPeriodYears}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={calcPeriod}
                      onChange={(e) => setCalcPeriod(Number(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                      <span>1 {t.calcPeriodYear}</span>
                      <span>15 {t.calcPeriodYears}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Live Calculator Results */}
                <div className="bg-slate-950 text-white rounded-xl p-4 border border-white/5 space-y-3.5 shadow-inner">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{t.calcInvested}</span>
                    <span className="tabular-nums font-semibold">₹{totalInvested.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{t.calcReturns}</span>
                    <span className="tabular-nums font-semibold text-blue-400">
                      +₹{estimatedReturns.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-2.5 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-300">{t.calcFutureVal}</span>
                    <span className="font-display font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tabular-nums">
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
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest block">
                      {t.calcMetricsLabel}
                    </label>
                    <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
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
                            ? 'bg-blue-50 border-blue-300 shadow-sm scale-102 ring-2 ring-blue-500/20'
                            : 'bg-gray-50/50 hover:bg-gray-100/50 border-gray-200'
                        }`}
                      >
                        <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">{m.l}</p>
                        <p className="font-display font-extrabold text-base text-slate-800 mt-1 tabular-nums">
                          {m.v}
                        </p>
                        <span className="text-[8px] text-blue-600 mt-1 block font-semibold hover:underline">
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
                        className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed"
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
      <section className="py-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <SectionLabel>{t.problemSectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-slate-800">
              {t.problemTitle}
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {t.problems.map((item: any, i: number) => (
              <FadeUp key={item.title} delay={i * 0.1}>
                <div className="feature-card">
                  <span className="text-3xl" aria-hidden>{item.icon}</span>
                  <h3 className="font-display font-semibold text-slate-800 text-base">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{item.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-14">
            <SectionLabel>{t.processSectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-slate-800">
              {t.processTitle}
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-9 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gray-200 z-0" />

            {[
              { step: '01', color: 'from-slate-700 to-slate-600' },
              { step: '02', color: 'from-blue-600 to-blue-700' },
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
                      <h3 className="font-display font-semibold text-slate-800 text-lg mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                      <p className="mt-3 text-[10px] font-semibold text-blue-600 uppercase tracking-widest">{item.tag}</p>
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
      <section id="integrity" className="py-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <SectionLabel>{t.integritySectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-slate-800 mb-3">
              {t.integrityTitle}
            </h2>
            <p className="text-sm text-gray-600 max-w-xl mx-auto">
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
                      <p className="font-display font-bold text-slate-800 tabular-nums mt-0.5">{m.v}</p>
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
                  <p className="text-sm text-slate-700 leading-relaxed">
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
      <section id="trust" className="py-20 bg-gray-50 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-10">
            <SectionLabel>{t.integritySectionLabel}</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-slate-800">
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
      <section className="relative overflow-hidden py-24 sm:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="absolute pointer-events-none inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <FadeUp>
            <p className="text-blue-300 text-sm font-semibold uppercase tracking-widest mb-3">{t.ctaSectionLabel}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight">
              {t.ctaTitle}
            </h2>
            <p className="mt-4 text-slate-300 max-w-lg mx-auto text-base leading-relaxed">
              {t.ctaSub}
            </p>
          </FadeUp>
          <FadeUp delay={0.15}>
            <Link to="/start" className="btn-primary text-base px-8 py-4 shadow-xl shadow-blue-900/40">
              {t.ctaButton}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <p className="mt-4 text-xs text-slate-400">{t.ctaFooterInfo}</p>
          </FadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 text-center">
        <p className="text-xs text-slate-500">
          {t.footerCopy}
        </p>
      </footer>

    </div>
  )
}
