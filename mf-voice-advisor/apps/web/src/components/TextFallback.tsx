import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onSend: (text: string) => void
  onMicClick: () => void
  disabled?: boolean
  orbState?: 'idle' | 'listening' | 'speaking' | 'thinking'
}

export default function TextFallback({ onSend, onMicClick, disabled, orbState = 'idle' }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isListening = orbState === 'listening'
  const isThinking = orbState === 'thinking'
  const isSpeaking = orbState === 'speaking'

  // Re-focus input when AI finishes speaking
  useEffect(() => {
    if (orbState === 'idle' && !isListening) {
      inputRef.current?.focus()
    }
  }, [orbState])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
    }
  }

  const statusText = isThinking
    ? 'FundWise is thinking...'
    : isSpeaking
      ? 'FundWise is speaking — tap 🎤 to reply'
      : isListening
        ? 'Listening — tap mic to stop'
        : null

  return (
    <div className="space-y-2">
      {/* Contextual status hint */}
      <AnimatePresence>
        {statusText && (
          <motion.p
            key={statusText}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-center text-warm-400 font-medium italic px-2"
          >
            {statusText}
          </motion.p>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="w-full relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isListening}
          placeholder={isListening ? 'Listening…' : isThinking ? 'Analysing your answer…' : 'Type your answer or tap 🎤 to speak…'}
          className={`
            w-full border rounded-full pl-5 pr-28 py-3.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400
            shadow-sm transition-all duration-200 text-navy-800 placeholder-warm-400
            ${isListening
              ? 'bg-teal-50 border-teal-300 text-teal-700 placeholder-teal-400'
              : 'bg-white border-warm-200 disabled:opacity-50 disabled:bg-warm-50'
            }
          `}
          aria-label="Type your answer"
          maxLength={400}
        />

        {/* Right-side button cluster */}
        <div className="absolute right-2 flex items-center gap-1.5">

          {/* Mic button */}
          <button
            type="button"
            onClick={onMicClick}
            disabled={disabled && !isListening}
            className={`
              w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-teal-400 active:scale-95
              ${isListening
                ? 'bg-teal-500 text-white shadow-md shadow-teal-200'
                : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
              }
            `}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            title={isListening ? 'Stop listening' : 'Speak your answer'}
          >
            {isListening ? (
              /* Stop icon */
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              /* Mic icon */
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!text.trim() || !!disabled}
            className="w-9 h-9 flex items-center justify-center bg-navy-700 text-white rounded-full hover:bg-teal-600 active:scale-95 disabled:bg-warm-300 disabled:text-warm-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-sm"
            aria-label="Send answer"
          >
            <svg className="w-4 h-4 translate-x-[1px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>

      {/* Character counter — only shows near limit */}
      {text.length > 280 && (
        <p className={`text-[10px] text-right pr-2 tabular-nums ${text.length > 370 ? 'text-red-400' : 'text-warm-400'}`}>
          {text.length}/400
        </p>
      )}
    </div>
  )
}
