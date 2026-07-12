import { motion } from 'framer-motion'
import { TRANSLATIONS } from '../lib/translations'
import { STAGE_LABELS } from '../../../../packages/shared/src/constants'

interface Props {
  stageIndex: number
}

const TOTAL_STAGES = 6

export default function StageLabel({ stageIndex }: Props) {
  const safeIndex = Math.max(0, Math.min(stageIndex, STAGE_LABELS.length - 1))
  const lang = localStorage.getItem('pref-lang') || 'en'
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en
  const stageKeys = ['stageAge', 'stageAmt', 'stageGoal', 'stageIncome', 'stageHorizon', 'stageRisk']
  const label = t[stageKeys[safeIndex]] || STAGE_LABELS[safeIndex]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.span
        key={label}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase hidden sm:block"
        role="status"
        aria-live="polite"
      >
        {label}
      </motion.span>

      {/* Segmented Progress Bar */}
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={safeIndex + 1} aria-valuemin={1} aria-valuemax={TOTAL_STAGES}>
        {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= safeIndex 
                ? 'w-6 sm:w-8 bg-blue-500' 
                : 'w-2 sm:w-3 bg-gray-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
