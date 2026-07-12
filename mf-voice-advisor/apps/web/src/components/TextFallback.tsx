import { APP_NAME } from '../config/constants'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  orbState?: 'idle' | 'listening' | 'speaking' | 'thinking'
}

export default function TextFallback({ onSend, disabled, orbState = 'idle' }: Props) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const onSendRef = useRef(onSend)
  const disabledRef = useRef(disabled)

  const isListening = orbState === 'listening'
  const isThinking = orbState === 'thinking'
  const isSpeaking = orbState === 'speaking'

  useEffect(() => {
    onSendRef.current = onSend
    disabledRef.current = disabled
  }, [onSend, disabled])

  // Re-focus input when AI finishes speaking
  useEffect(() => {
    if (orbState === 'idle' && !isListening) {
      inputRef.current?.focus()
    }
  }, [orbState, isListening])

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
        setText(transcript)
        transcriptRef.current = transcript
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        const finalTranscript = transcriptRef.current.trim()
        if (finalTranscript && !disabledRef.current) {
          onSendRef.current(finalTranscript)
          setText('')
          transcriptRef.current = ''
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      setText('')
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
    }
  }

  const statusText = isThinking
    ? `${APP_NAME} is thinking...`
    : isSpeaking
      ? `${APP_NAME} is speaking...`
      : isListening
        ? 'Listening...'
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
            className="text-[11px] text-center text-gray-400 font-medium italic px-2"
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
          placeholder={isListening ? 'Listening…' : isThinking ? 'Analysing your answer…' : isRecording ? 'Listening...' : 'Type your answer…'}
          className={`
            w-full border rounded-full pl-5 pr-28 py-3.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
            shadow-sm transition-all duration-200 text-slate-800 placeholder-gray-400
            ${isListening || isRecording
              ? 'bg-blue-50 border-blue-300 text-blue-700 placeholder-blue-400'
              : 'bg-white border-gray-200 disabled:opacity-50 disabled:bg-gray-50'
            }
          `}
          aria-label="Type your answer"
          maxLength={400}
        />

        {/* Right-side button cluster */}
        <div className="absolute right-2 flex items-center gap-1.5">

          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={disabled || isListening || !recognitionRef.current}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300'
            }`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="6" y="6" width="12" height="12" rx="2" stroke="none" fill="currentColor" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v10M8.5 7.5a3.5 3.5 0 0 0 7 0V5a3.5 3.5 0 0 0-7 0v2.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 0 1-14 0v-1M12 18.5v4M9 22.5h6" />
              </svg>
            )}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!text.trim() || !!disabled}
            className="w-9 h-9 flex items-center justify-center bg-slate-700 text-white rounded-full hover:bg-blue-600 active:scale-95 disabled:bg-gray-300 disabled:text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
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
        <p className={`text-[10px] text-right pr-2 tabular-nums ${text.length > 370 ? 'text-red-400' : 'text-gray-400'}`}>
          {text.length}/400
        </p>
      )}
    </div>
  )
}
