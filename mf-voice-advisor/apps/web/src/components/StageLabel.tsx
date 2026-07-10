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
  const progress = Math.round(((safeIndex) / (TOTAL_STAGES - 1)) * 100)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <motion.span
          key={label}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-[11px] font-semibold text-navy-600 tracking-wide uppercase hidden sm:block"
          role="status"
          aria-live="polite"
        >
          {label}
        </motion.span>
        <span className="text-[10px] text-warm-400 tabular-nums">
          {safeIndex + 1}/{TOTAL_STAGES}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-28 sm:w-36 h-1 bg-warm-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-navy-600 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={`Conversation progress: ${progress}%`}
        />
      </div>
    </div>
  )
}
