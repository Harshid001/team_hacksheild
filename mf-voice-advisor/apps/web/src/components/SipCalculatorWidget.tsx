import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SipCalculatorWidgetProps {
  horizonString?: string
  onSelectSip: (amount: string, target?: string) => void
  disabled?: boolean
}

export default function SipCalculatorWidget({ horizonString, onSelectSip, disabled }: SipCalculatorWidgetProps) {
  const [mode, setMode] = useState<'quick' | 'calc'>('calc')
  const [targetAmount, setTargetAmount] = useState<number>(1000000) // Default 10L
  const [calculatedSip, setCalculatedSip] = useState<number>(0)

  // Parse years from string like "1-3 years" or "< 1 year"
  const getYears = (str?: string) => {
    if (!str) return 5 // Default 5 years
    if (str.includes('<')) return 1
    if (str.includes('1-3')) return 2
    if (str.includes('3-7')) return 5
    if (str.includes('7+')) return 10
    return 5
  }

  const years = getYears(horizonString)
  const rate = 12 // Assumed 12% CAGR for equity

  useEffect(() => {
    // SIP = (Target * r) / (((1 + r)^n - 1) * (1 + r))
    const monthlyRate = rate / 12 / 100
    const months = years * 12
    
    if (months > 0 && monthlyRate > 0) {
      const sip = (targetAmount * monthlyRate) / ((Math.pow(1 + monthlyRate, months) - 1) * (1 + monthlyRate))
      setCalculatedSip(Math.ceil(sip))
    }
  }, [targetAmount, years])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  const handleUseCalculated = () => {
    onSelectSip(formatCurrency(calculatedSip), formatCurrency(targetAmount))
  }

  return (
    <div className="w-full bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden mb-2">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setMode('calc')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mode === 'calc' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Calculate for a Goal
        </button>
        <button
          onClick={() => setMode('quick')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mode === 'quick' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          I know my SIP
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'calc' ? (
          <motion.div
            key="calc"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="p-5 space-y-5"
          >
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-slate-700">Target Corpus</label>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(targetAmount)}</span>
              </div>
              <input
                type="range"
                min="100000"
                max="50000000"
                step="100000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>₹1L</span>
                <span>₹5Cr</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Required Monthly SIP</p>
                <p className="text-sm font-medium text-slate-600">
                  For <span className="font-bold text-slate-800">{years} years</span> at 12% est. CAGR
                </p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-800 break-all">{formatCurrency(calculatedSip)}</p>
            </div>

            <button
              onClick={handleUseCalculated}
              disabled={disabled}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Use {formatCurrency(calculatedSip)} / month
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="quick"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="p-5"
          >
            <div className="grid grid-cols-2 gap-3">
              {['₹5,000', '₹10,000', '₹25,000', '₹50,000'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => onSelectSip(amt)}
                  disabled={disabled}
                  className="py-3 px-4 border border-gray-200 rounded-xl font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors disabled:opacity-50"
                >
                  {amt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
