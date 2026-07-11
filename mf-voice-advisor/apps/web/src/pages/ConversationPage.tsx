import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { startSession, sendAnswer } from '../lib/api'
import { createRecognizer, isSTTSupported } from '../lib/speechRecognition'
import { speak, stopSpeaking } from '../lib/speechSynthesis'
import { TRANSLATIONS } from '../lib/translations'
import { useTheme } from '../context/ThemeContext'

import ConversationBubble from '../components/ConversationBubble'
import ListeningIndicator from '../components/ListeningIndicator'
import StageLabel from '../components/StageLabel'
import TextFallback from '../components/TextFallback'
import QuickReplies from '../components/QuickReplies'
import SipCalculatorWidget from '../components/SipCalculatorWidget'

type Message = { id: string; role: 'ai' | 'user' | 'hint'; text: string }

const QUICK_OPTIONS = [
  [], // 0: intro
  ['18-25', '26-35', '36-45', '46-55', '56+'], // 1: Age
  ['< 1 year', '1-3 years', '3-7 years', '7+ years'], // 2: Horizon
  [], // 3: Amount (Handled by SipCalculatorWidget)
  ['Conservative', 'Moderate', 'Aggressive'], // 4: Risk
  [], // 5: Final
]

export default function ConversationPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const lang = localStorage.getItem('pref-lang') || 'en'
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [stageIndex, setStageIndex] = useState(0)
  const [interimText, setInterimText] = useState('')

  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [sttSupported, setSttSupported] = useState(true)
  const [isAiTyping, setIsAiTyping] = useState(false)
  
  // Live Profile State
  const [liveProfile, setLiveProfile] = useState<{ age?: string; horizon?: string; amount?: string; risk?: string; targetGoal?: string }>({})

  const stopSttRef = useRef<(() => void) | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Initialize session on mount
  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        let sid = sessionStorage.getItem('sessionId')
        // Validate cached sessionId — reject fake/fallback IDs
        if (sid && (sid.startsWith('fallback') || sid.length < 10)) {
          sessionStorage.removeItem('sessionId')
          sid = null
        }
        if (!sid) {
          sid = await startSession()
          sessionStorage.setItem('sessionId', sid)
        }
        if (!mounted) return
        setSessionId(sid)
        setSttSupported(isSTTSupported())

        // Show typing indicator, then first question
        setIsAiTyping(true)
        setTimeout(() => {
          if (!mounted) return
          setIsAiTyping(false)
          const welcomeMsg = t.convWelcome
          const welcomeHint = t.convWelcomeHint
          
          handleNewQuestion(welcomeMsg, welcomeHint)
        }, 1200)
      } catch (err) {
        console.error('Session start failed', err)
        // Clear stale session and redirect back
        sessionStorage.removeItem('sessionId')
        if (mounted) navigate('/start')
      }
    }
    init()
    return () => { mounted = false; stopSpeaking() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiTyping])

  const handleNewQuestion = (qText: string, hint?: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: qText }])
    if (hint) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'hint', text: hint }])
      }, 600)
    }

    if (!isMuted) {
      setOrbState('speaking')
      const langSpeechMap: Record<string, string> = {
        en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN',
        ur: 'ur-PK', pa: 'pa-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN'
      }
      speak(qText, {
        lang: langSpeechMap[lang] || 'en-IN',
        onEnd: () => setOrbState('idle'),
        onError: () => setOrbState('idle')
      })
    } else {
      setOrbState('idle')
    }
  }

  const handleSendAnswer = async (text: string, targetGoal?: string) => {
    if (!sessionId) return
    stopSpeaking()
    if (stopSttRef.current) { stopSttRef.current(); stopSttRef.current = null }
    setInterimText('')

    // Update Live Profile based on current stage before incrementing
    if (stageIndex === 1) setLiveProfile(p => ({ ...p, age: text }))
    if (stageIndex === 2) setLiveProfile(p => ({ ...p, horizon: text }))
    if (stageIndex === 3) setLiveProfile(p => ({ ...p, amount: text, targetGoal: targetGoal || p.targetGoal }))
    if (stageIndex === 4) setLiveProfile(p => ({ ...p, risk: text }))

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }])
    setOrbState('thinking')
    setIsAiTyping(true)

    try {
      const { nextQuestion, isComplete } = await sendAnswer(sessionId, text)
      if (isComplete) {
        setIsAiTyping(false)
        navigate(`/report/${sessionId}`)
      } else {
        setStageIndex(p => Math.min(p + 1, 5))
        setIsAiTyping(false)
        handleNewQuestion(nextQuestion)
      }
    } catch (err) {
      console.error(err)
      setIsAiTyping(false)
      setOrbState('idle')
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: 'Sorry, something went wrong. Please try again or refresh the page.'
      }])
    }
  }

  const startListening = () => {
    if (!sttSupported || isMuted || orbState === 'thinking') return
    stopSpeaking()
    setOrbState('listening')
    setInterimText('')

    stopSttRef.current = createRecognizer({
      onInterim: (text) => setInterimText(text),
      onFinal: (text) => {
        setOrbState('idle')
        setInterimText('')
        if (text) handleSendAnswer(text)
      },
      onError: (code) => {
        setOrbState('idle')
        setInterimText('')
        if (code === 'mic-denied') setIsMuted(true)
      },
      onEnd: () => {
        if (orbState === 'listening') setOrbState('idle')
      }
    })
  }

  const handleOrbClick = () => {
    if (orbState === 'idle' || orbState === 'speaking') startListening()
    else if (orbState === 'listening' && stopSttRef.current) {
      stopSttRef.current()
      setOrbState('idle')
      setInterimText('')
    }
  }

  return (
    <main className="h-screen max-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-slate-900 overflow-hidden relative">

      {/* ── Main Chat Area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <header className="px-4 py-3 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            {/* Exit Button */}
          <button
            onClick={() => {
              stopSpeaking()
              navigate('/')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 select-none"
            aria-label="Exit conversation"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t.convExit}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>

          {/* Progress indicator */}
          <StageLabel stageIndex={stageIndex} />
        </header>

        {/* ── Chat Transcript ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-4 sm:px-6 py-6 space-y-5">
            {/* Empty state — shown before first message */}
            <AnimatePresence>
              {messages.length === 0 && !isAiTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-card">
                    M
                  </div>
                  <p className="text-base font-display font-semibold text-slate-700 dark:text-white">
                    {t.convAdvisorReady}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    {t.convAdvisorSub}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            {messages.map(m => (
              <ConversationBubble key={m.id} role={m.role} text={m.text} />
            ))}

            {/* AI typing indicator */}
            <AnimatePresence>
              {isAiTyping && (
                <motion.div
                  key="typing-indicator"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-end gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
                    M
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={transcriptEndRef} className="h-1" />
          </div>
        </div>

        {/* ── Bottom Input Area ────────────────────────────────────── */}
        <div className="bg-white border-t border-gray-200 pt-3 pb-4 px-4 flex-shrink-0">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Reverse SIP Calculator Widget */}
            <AnimatePresence>
              {!isAiTyping && orbState !== 'thinking' && stageIndex === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <SipCalculatorWidget
                    horizonString={liveProfile.horizon}
                    onSelectSip={handleSendAnswer}
                    disabled={orbState === 'listening'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Replies row */}
            <AnimatePresence>
              {!isAiTyping && orbState !== 'thinking' && QUICK_OPTIONS[stageIndex] && QUICK_OPTIONS[stageIndex].length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <QuickReplies
                    options={QUICK_OPTIONS[stageIndex]}
                    onSelect={(val) => handleSendAnswer(val)}
                    disabled={orbState === 'listening'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <TextFallback
              onSend={(val) => handleSendAnswer(val)}
              disabled={orbState === 'thinking' || !sessionId}
              orbState={orbState}
            />
            <p className="text-[10px] text-center text-gray-300 select-none">
              {t.convInputHint}
            </p>
          </div>
        </div>
      </div>

      {/* ── Live Profile Sidebar ─────────────────────────────────── */}
      <div className="hidden md:flex w-80 bg-slate-50 flex-col border-l border-gray-200 relative">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Live Profile</h3>
          
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">Age Group</p>
              <p className="font-semibold text-slate-800">{liveProfile.age || '—'}</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">Time Horizon</p>
              <p className="font-semibold text-slate-800">{liveProfile.horizon || '—'}</p>
            </div>

            {liveProfile.targetGoal && (
              <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <p className="text-xs text-blue-600 font-semibold mb-1 relative z-10">Target Goal</p>
                <p className="font-bold text-slate-800 text-lg relative z-10">{liveProfile.targetGoal}</p>
              </div>
            )}
            
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">Monthly Investment</p>
              <p className="font-semibold text-slate-800">{liveProfile.amount || '—'}</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">Risk Comfort</p>
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                {liveProfile.risk && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                {liveProfile.risk || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Voice Overlay (listening mode) ───────────────────────── */}
      <AnimatePresence>
        {orbState === 'listening' && (
          <motion.div
            key="voice-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white"
          >
            <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
              <div>
                <h2 className="text-xl font-display font-semibold text-blue-300 mb-1">
                  {t.convListeningTitle}
                </h2>
                <p className="text-sm text-slate-300">
                  {t.convListeningSub}
                </p>
              </div>

              <ListeningIndicator
                state={orbState}
                onClick={handleOrbClick}
                disabled={!sessionId || isMuted}
              />

              {/* Live interim transcript */}
              <AnimatePresence>
                {interimText && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 w-full max-w-xs"
                  >
                    <p className="text-sm text-white/80 italic leading-relaxed">"{interimText}…"</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => {
                  if (stopSttRef.current) {
                    stopSttRef.current()
                    stopSttRef.current = null
                  }
                  setInterimText('')
                  setOrbState('idle')
                }}
                className="px-5 py-2 rounded-full border border-white/20 text-white/80 hover:bg-white/10 hover:text-white active:scale-95 transition-all text-xs font-medium"
              >
                {t.convListeningCancel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
