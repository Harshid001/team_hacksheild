import { motion, AnimatePresence } from 'framer-motion'

interface QuickRepliesProps {
  options: string[]
  onSelect: (option: string) => void
  disabled?: boolean
}

export default function QuickReplies({ options, onSelect, disabled = false }: QuickRepliesProps) {
  if (!options || options.length === 0) return null

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex items-center gap-2 px-1">
        <AnimatePresence>
          {options.map((option, idx) => (
            <motion.button
              key={option}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              onClick={() => onSelect(option)}
              disabled={disabled}
              className="flex-shrink-0 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {option}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
