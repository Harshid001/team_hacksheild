import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { startSession, sendAnswer } from '../lib/api'
import { createRecognizer, isSTTSupported } from '../lib/speechRecognition'
import { speak, stopSpeaking } from '../lib/speechSynthesis'
import { TRANSLATIONS } from '../lib/translations'

import ConversationBubble from '../components/ConversationBubble'
import ListeningIndicator from '../components/ListeningIndicator'
import MicControls from '../components/MicControls'
import StageLabel from '../components/StageLabel'
import TextFallback from '../components/TextFallback'

type Message = { id: string; role: 'ai' | 'user' | 'hint'; text: string }

export default function ConversationPage() {
  const navigate = useNavigate()
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

  const stopSttRef = useRef<(() => void) | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Initialize session on mount
  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        let sid = sessionStorage.getItem('sessionId')
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

  const handleSendAnswer = async (text: string) => {
    if (!sessionId) return
    stopSpeaking()
    if (stopSttRef.current) { stopSttRef.current(); stopSttRef.current = null }
    setInterimText('')

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }])
    setOrbState('thinking')

    try {
      const { nextQuestion, isComplete } = await sendAnswer(sessionId, text)
      if (isComplete) {
        navigate(`/report/${sessionId}`)
      } else {
        setStageIndex(p => Math.min(p + 1, 5))
        // Show typing indicator before AI response
        setIsAiTyping(true)
        setTimeout(() => {
          setIsAiTyping(false)
          handleNewQuestion(nextQuestion)
        }, 800)
      }
    } catch (err) {
      console.error(err)
      setOrbState('idle')
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
    <main className="h-screen max-h-screen flex flex-col bg-warm-50 overflow-hidden relative">

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header className="px-4 py-3 flex items-center justify-between bg-white border-b border-warm-200 flex-shrink-0 shadow-sm">
        {/* Exit Button */}
        <button
          onClick={() => {
            stopSpeaking()
            navigate('/')
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warm-200 text-xs font-semibold text-warm-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 select-none"
          aria-label="Exit conversation"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t.convExit}</span>
        </button>

        {/* Progress indicator */}
        <StageLabel stageIndex={stageIndex} />

        {/* Controls */}
        <MicControls
          isMuted={isMuted}
          onToggleMute={() => {
            setIsMuted(m => !m)
            if (orbState === 'speaking') stopSpeaking()
          }}
          onReplay={() => {
            const lastQ = [...messages].reverse().find(m => m.role === 'ai')
            if (lastQ && !isMuted) {
              setOrbState('speaking')
              speak(lastQ.text, { onEnd: () => setOrbState('idle') })
            }
          }}
        />
      </header>

      {/* ── Chat Transcript ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* Empty state — shown before first message */}
          <AnimatePresence>
            {messages.length === 0 && !isAiTyping && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-700 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-card">
                  F
                </div>
                <p className="text-base font-display font-semibold text-navy-700">
                  {t.convAdvisorReady}
                </p>
                <p className="text-sm text-warm-500 max-w-xs">
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
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy-700 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
                  F
                </div>
                <div className="bg-white border border-warm-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={transcriptEndRef} className="h-1" />
        </div>
      </div>

      {/* ── Bottom Input Area ────────────────────────────────────── */}
      <div className="bg-white border-t border-warm-200 pt-3 pb-4 px-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto space-y-2">
          <TextFallback
            onSend={handleSendAnswer}
            onMicClick={handleOrbClick}
            disabled={orbState === 'thinking' || !sessionId}
            orbState={orbState}
          />
          <p className="text-[10px] text-center text-warm-300 select-none">
            {t.convInputHint}
          </p>
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
            className="absolute inset-0 z-50 bg-navy-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white"
          >
            <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
              <div>
                <h2 className="text-xl font-display font-semibold text-teal-300 mb-1">
                  {t.convListeningTitle}
                </h2>
                <p className="text-sm text-navy-300">
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
