import { APP_NAME } from '../config/constants'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  role: 'ai' | 'user' | 'hint'
  text: string
  isTyping?: boolean
}

export default function ConversationBubble({ role, text, isTyping = false }: Props) {
  const isUser = role === 'user'
  const isHint = role === 'hint'

  if (isHint) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-start pl-10"
      >
        <span className="text-xs text-gray-500 dark:text-gray-400 italic px-3 py-1.5 bg-gray-100/70 dark:bg-slate-800/70 border border-gray-200/60 dark:border-slate-700/60 rounded-xl max-w-sm leading-relaxed">
          💡 {text}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
          M
        </div>
      )}

      {/* Bubble */}
      <div
        className={`
          max-w-[80%] sm:max-w-[72%] px-4 py-3 text-sm leading-relaxed shadow-sm
          ${isUser
            ? 'bg-gradient-to-br from-slate-700 to-blue-700 text-white rounded-2xl rounded-br-sm'
            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-2xl rounded-bl-sm'
          }
        `}
        role={isUser ? undefined : 'status'}
        aria-live={isUser ? undefined : 'polite'}
      >
        <AnimatePresence mode="wait">
          {isTyping ? (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 py-0.5"
              aria-label={`${APP_NAME} is typing`}
            >
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </motion.div>
          ) : (
            <motion.span
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {text}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-[10px] font-bold flex-shrink-0">
          YOU
        </div>
      )}
    </motion.div>
  )
}
