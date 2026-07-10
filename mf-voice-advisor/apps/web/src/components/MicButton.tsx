import { motion } from 'framer-motion'

interface Props {
  state: 'idle' | 'listening' | 'speaking' | 'thinking'
  onClick: () => void
  disabled?: boolean
}

export default function MicButton({ state, onClick, disabled }: Props) {
  const getOrbClass = () => {
    switch (state) {
      case 'idle':      return 'bg-teal-500 orb-idle'
      case 'listening': return 'bg-teal-400 orb-listen scale-110'
      case 'speaking':  return 'bg-navy-500 orb-speak'
      case 'thinking':  return 'bg-warm-400 opacity-80'
      default:          return 'bg-teal-500'
    }
  }

  const getLabel = () => {
    switch (state) {
      case 'idle':      return 'Tap to speak'
      case 'listening': return 'Listening...'
      case 'speaking':  return 'Speaking...'
      case 'thinking':  return 'Thinking...'
      default:          return ''
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state === 'thinking' || state === 'speaking'}
        className="relative group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 rounded-full transition-transform"
        aria-label={getLabel()}
      >
        <motion.div
          layout
          className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${getOrbClass()}`}
        >
          {state === 'idle' && (
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}

          {state === 'listening' && (
            <div className="flex items-center gap-1.5 h-8">
              <div className="wave-bar h-full"></div>
              <div className="wave-bar h-full"></div>
              <div className="wave-bar h-full"></div>
              <div className="wave-bar h-full"></div>
              <div className="wave-bar h-full"></div>
            </div>
          )}

          {state === 'speaking' && (
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}

          {state === 'thinking' && (
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </motion.div>
      </button>
      <p className="mt-4 text-xs font-semibold text-teal-600 tracking-wider uppercase">{getLabel()}</p>
    </div>
  )
}
