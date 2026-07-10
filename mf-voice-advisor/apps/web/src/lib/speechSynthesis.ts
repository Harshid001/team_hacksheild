/**
 * speechSynthesis.ts
 * Web Speech API TTS wrapper.
 */

export type TTSOptions = {
  lang?: string
  rate?: number
  pitch?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

export const isTTSSupported = (): boolean => 'speechSynthesis' in window

export function speak(text: string, opts: TTSOptions = {}): void {
  if (!isTTSSupported()) return
  stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = opts.lang ?? 'en-IN'
  utterance.rate = opts.rate ?? 0.95
  utterance.pitch = opts.pitch ?? 1.0

  // Prefer a natural-sounding en voice if available
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
  )
  if (preferred) utterance.voice = preferred

  utterance.onstart = () => opts.onStart?.()
  utterance.onend = () => opts.onEnd?.()
  utterance.onerror = () => opts.onError?.()

  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (!isTTSSupported()) return
  window.speechSynthesis.cancel()
}

export function isSpeaking(): boolean {
  return window.speechSynthesis?.speaking ?? false
}
