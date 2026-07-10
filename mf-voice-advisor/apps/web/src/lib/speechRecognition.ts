/**
 * speechRecognition.ts
 * Web Speech API wrapper (STT).
 * Falls back gracefully when browser doesn't support SpeechRecognition.
 */

export type STTCallbacks = {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onError: (code: 'mic-denied' | 'no-speech' | 'unsupported' | 'other') => void
  onStart?: () => void
  onEnd?: () => void
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition ||
  null

export const isSTTSupported = (): boolean => !!SpeechRecognitionAPI

export function createRecognizer(callbacks: STTCallbacks): (() => void) | null {
  if (!SpeechRecognitionAPI) {
    callbacks.onError('unsupported')
    return null
  }

  const rec = new SpeechRecognitionAPI()
  rec.continuous = false
  rec.interimResults = true
  const prefLang = localStorage.getItem('pref-lang') || 'en'
  const langSpeechMap: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    bn: 'bn-IN',
    sd: 'sd-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    ur: 'ur-PK',
    pa: 'pa-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN'
  }
  rec.lang = langSpeechMap[prefLang] || 'en-IN'
  rec.maxAlternatives = 1

  rec.onstart = () => callbacks.onStart?.()
  rec.onend = () => callbacks.onEnd?.()

  rec.onresult = (event: any) => {
    let interim = '', final = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i]
      if (r.isFinal) final += r[0].transcript
      else interim += r[0].transcript
    }
    if (interim) callbacks.onInterim((final || interim).trim())
    if (final) callbacks.onFinal(final.trim())
  }

  rec.onerror = (event: any) => {
    if (event.error === 'not-allowed' || event.error === 'permission-denied')
      callbacks.onError('mic-denied')
    else if (event.error === 'no-speech')
      callbacks.onError('no-speech')
    else
      callbacks.onError('other')
  }

  try { rec.start() } catch { /* already started */ }

  return () => { try { rec.abort() } catch { /* ignore */ } }
}
