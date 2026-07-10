import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { startSession } from '../lib/api'
import DisclaimerBanner from '../components/DisclaimerBanner'
import { TRANSLATIONS } from '../lib/translations'

export default function DisclaimerPage() {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleStart = async () => {
    setLoading(true)
    try {
      const sid = await startSession()
      sessionStorage.setItem('sessionId', sid)
      navigate('/conversation')
    } catch (err) {
      console.error('Failed to create session', err)
      // fallback navigate in case of API failure
      sessionStorage.setItem('sessionId', `fallback-${Date.now()}`)
      navigate('/conversation')
    } finally {
      setLoading(false)
    }
  }

  const lang = localStorage.getItem('pref-lang') || 'en'
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en

  const badgeText = t.disclaimerBadge
  const titlePart1 = t.disclaimerTitlePart1
  const titlePart2 = t.disclaimerTitlePart2
  const subText = t.disclaimerSub
  const btnCreating = t.disclaimerBtnCreating
  const btnStart = t.disclaimerBtnStart

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-100/30 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10 flex flex-col gap-8"
      >
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {badgeText}
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-slate-800 leading-tight">
            {titlePart1}<br />
            <span className="text-gradient">{titlePart2}</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            {subText}
          </p>
        </header>

        <DisclaimerBanner 
          variant="acknowledge" 
          acknowledged={agreed} 
          onAcknowledgeChange={setAgreed}
        />

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleStart}
            disabled={!agreed || loading}
            className="btn-primary w-full sm:w-auto text-lg px-8 py-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {btnCreating}
              </>
            ) : (
              <>
                {btnStart}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </main>
  )
}
