import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FundRecommendation } from '../../../../packages/shared/src/types'

interface Props {
  recommendation: FundRecommendation
}

export default function ReportCard({ recommendation }: Props) {
  const {
    categoryName,
    emoji,
    description,
    color,
    riskTag,
    representativeMetrics: metrics,
    aiExplanation,
  } = recommendation

  const [showAiExp, setShowAiExp] = useState(true)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="solid-card dark:bg-slate-800 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b"
        style={{ borderBottomColor: `${color}20`, background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)` }}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="text-2xl" aria-hidden="true">{emoji}</span>
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg leading-tight">{categoryName}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center self-start sm:self-auto gap-2">
           <span className="text-xs font-semibold px-2.5 py-1 rounded-md border" style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>
             {riskTag} Risk
           </span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Real Data Section */}
        <section aria-label="Computed Historical Data">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
               <span className="badge-computed">
                 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                 </svg>
                 Real Historical Data
               </span>
               <span className="text-xs text-gray-400 font-medium">Computed from mfapi.in</span>
             </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-blue-50/40 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4">
            <MetricBox label="5Y CAGR" value={`${metrics.cagr5yr}%`} tooltip="Average annual growth rate over the past 5 years. Higher is better." />
            <MetricBox label="Volatility" value={`${metrics.volatilityAnnualized}%`} tooltip="How much the fund's returns bounce up and down. Lower means a smoother ride." />
            <MetricBox label="Sharpe Ratio" value={metrics.sharpeRatio.toString()} tooltip="Return earned per unit of risk. Over 1.0 is generally considered good." />
            <MetricBox label="Max Drawdown" value={`${metrics.maxDrawdown}%`} tooltip="The biggest historical drop from peak to trough. Shows the worst-case scenario." />
            <MetricBox label="Expense Ratio" value={`${metrics.expenseRatio}%`} tooltip="The annual fee the fund charges you. Lower is better." />
          </div>
        </section>

        {/* AI Explanation Section */}
        <section aria-label="AI Explanation">
           <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
               <span className="badge-ai">
                 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                 </svg>
                 AI Explanation
               </span>
             </div>
             <button
               onClick={() => setShowAiExp(!showAiExp)}
               className="text-xs text-gray-500 dark:text-gray-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
               aria-expanded={showAiExp}
             >
               {showAiExp ? 'Hide' : 'Show'}
               <svg className={`w-3.5 h-3.5 transition-transform ${showAiExp ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
               </svg>
             </button>
           </div>

           <AnimatePresence>
             {showAiExp && (
               <motion.div
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="overflow-hidden"
               >
                 <div className="bg-violet-50/50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/50 rounded-xl p-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                   {aiExplanation}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </section>

      </div>
    </motion.article>
  )
}

function MetricBox({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  return (
    <div className="tooltip-container group flex flex-col justify-center">
      <div className="flex items-center gap-1 mb-1 text-gray-500 dark:text-gray-400">
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
        <svg className="w-3 h-3 cursor-help text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="font-display font-bold text-slate-700 dark:text-slate-200 text-lg">{value}</div>

      {/* Tooltip */}
      <div className="tooltip-box absolute bottom-full left-0 mb-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-lg z-10 pointer-events-none">
        {tooltip}
        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 transform rotate-45 -mt-1"></div>
      </div>
    </div>
  )
}
