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

  utterance.volume = 1.0 // Loud voice

  // Ensure voices are loaded (they sometimes load asynchronously)
  const voices = window.speechSynthesis.getVoices()
  
  // Prefer a male AI voice
  let preferred = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.toLowerCase().includes('male') || v.name.includes('Google UK English Male'))
  )

  // Fallback to any Google/Natural English voice if male voice isn't found
  if (!preferred) {
    preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
    )
  }

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
