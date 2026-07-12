import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { startSession } from '../lib/api'
import DisclaimerBanner from '../components/DisclaimerBanner'
import { TRANSLATIONS } from '../lib/translations'
import { APP_NAME } from '../config/constants'

export default function DisclaimerPage() {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleStart = async () => {
    setLoading(true)
    try {
      const { sessionId } = await startSession()
      sessionStorage.setItem('sessionId', sessionId)
      navigate('/conversation')
    } catch (err) {
      console.error('Failed to create session', err)
      alert('Failed to start session. Please log out and log back in.')
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
    <main className="min-h-[100dvh] flex flex-col items-center px-4 py-8 sm:p-6 lg:p-8 relative bg-theme-bg overflow-x-hidden">
      
      {/* Minimal Header */}
      <header className="w-full max-w-2xl flex items-center justify-start mb-8 sm:mb-12 relative z-20">
         <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold shadow-md shadow-blue-900/20">
              M
            </div>
            <span className="font-display font-bold text-lg text-theme-text truncate tracking-tight">{APP_NAME}</span>
         </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10 flex flex-col gap-6"
      >
        <div className="text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {badgeText}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-theme-text leading-tight">
            {titlePart1} <span className="text-gradient">{titlePart2}</span>
          </h1>
          <p className="text-sm sm:text-base text-theme-text-secondary leading-relaxed max-w-lg">
            {subText}
          </p>
        </div>

        {/* Trust Badges Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {t.trustItems.map((item: any, idx: number) => (
            <div key={idx} className="bg-theme-elevated border border-theme-border p-4 rounded-xl shadow-sm flex flex-col gap-1.5">
              <span className="text-xl mb-1" aria-hidden>{item.icon}</span>
              <p className="text-[10px] font-bold text-theme-text uppercase tracking-widest">{item.title}</p>
              <p className="text-[11px] text-theme-text-secondary leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <DisclaimerBanner 
          variant="acknowledge" 
          acknowledged={agreed} 
          onAcknowledgeChange={setAgreed}
        />

        <div className="flex flex-col items-start gap-4 mt-2">
          <button
            onClick={handleStart}
            disabled={!agreed || loading}
            className="btn-primary w-full sm:w-auto text-base px-8 py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-xl disabled:shadow-none"
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
