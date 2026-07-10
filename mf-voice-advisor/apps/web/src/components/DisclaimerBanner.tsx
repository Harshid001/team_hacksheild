
import { TRANSLATIONS } from '../lib/translations'

interface Props {
  variant: 'acknowledge' | 'informational'
  acknowledged?: boolean
  onAcknowledgeChange?: (checked: boolean) => void
}

export default function DisclaimerBanner({ variant, acknowledged = false, onAcknowledgeChange }: Props) {
  const lang = localStorage.getItem('pref-lang') || 'en'
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en

  const disclaimerText = t.trustDisclaimer || t.disclaimerText
  const title = t.disclaimerTitle
  const checkboxLabel = t.disclaimerCheckboxLabel

  if (variant === 'informational') {
    return (
      <div 
        className="flex items-start gap-3 p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-amber-800 text-xs sm:text-sm leading-relaxed"
        role="note"
        aria-label="Educational disclaimer"
      >
        <span className="text-lg flex-shrink-0" aria-hidden>⚠️</span>
        <p className="font-medium">{disclaimerText}</p>
      </div>
    )
  }

  return (
    <div className="solid-card p-6 space-y-4" role="note" aria-label="Acknowledge disclaimer">
      <div className="flex items-center gap-2 text-amber-700">
        <span className="text-xl" aria-hidden>⚠️</span>
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider">{title}</h2>
      </div>
      
      <p className="text-sm text-gray-600 leading-relaxed">
        {disclaimerText}
      </p>

      {onAcknowledgeChange && (
        <label className="flex items-start gap-3 cursor-pointer group mt-4 pt-3 border-t border-gray-150">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => onAcknowledgeChange(e.target.checked)}
              className="sr-only"
              aria-label="I understand and acknowledge the mutual fund disclaimer"
            />
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                acknowledged 
                  ? 'bg-blue-600 border-blue-600' 
                  : 'border-gray-300 group-hover:border-blue-400'
              }`}
              aria-hidden="true"
            >
              {acknowledged && (
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 select-none leading-relaxed">
            {checkboxLabel}
          </span>
        </label>
      )}
    </div>
  )
}
