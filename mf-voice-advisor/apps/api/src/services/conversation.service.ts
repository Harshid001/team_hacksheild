/**
 * apps/web/lib/speechSynthesis.ts
 *
 * Wrapper around the browser's native SpeechSynthesis API.
 * Reads the bot's questions/report aloud. Supports cancel/interrupt
 * mid-speech for a "stop talking" / barge-in feel.
 * Owned by: Member A (Voice/STT Engineer)
 */

export type SpeakOptions = {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  voiceName?: string; // optional specific voice by name
  onEnd?: () => void;
  onStart?: () => void;
};

class BrowserSpeechSynthesis {
  private synth: SpeechSynthesis | null =
    typeof window !== "undefined" ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  isSupported(): boolean {
    return this.synth !== null;
  }

  /**
   * speak
   *
   * Speaks the given text aloud. Automatically cancels any currently
   * playing speech first, so calling speak() again acts as an interrupt —
   * useful for barge-in ("stop talking, I have something to say").
   */
  speak(text: string, options: SpeakOptions = {}) {
    if (!this.synth) return;

    // Cancel anything currently speaking/queued first
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    if (options.voiceName) {
      const voice = this.synth
        .getVoices()
        .find((v) => v.name === options.voiceName);
      if (voice) utterance.voice = voice;
    }

    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /** Immediately stop any speech in progress (barge-in / "stop talking"). */
  cancel() {
    if (!this.synth) return;
    this.synth.cancel();
    this.currentUtterance = null;
  }

  /** Pause current speech (can be resumed). */
  pause() {
    this.synth?.pause();
  }

  /** Resume paused speech. */
  resume() {
    this.synth?.resume();
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  /** List available system voices (populated async by some browsers). */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() ?? [];
  }
}

// Convenience singleton — the app only ever needs one voice output channel
let sharedInstance: BrowserSpeechSynthesis | null = null;

export function getSpeechSynthesis(): BrowserSpeechSynthesis {
  if (!sharedInstance) {
    sharedInstance = new BrowserSpeechSynthesis();
  }
  return sharedInstance;
}

/** Simple one-off convenience function for quick usage in components. */
export function speak(text: string, options?: SpeakOptions) {
  getSpeechSynthesis().speak(text, options);
}

/** Simple one-off convenience function to interrupt speech immediately. */
export function stopSpeaking() {
  getSpeechSynthesis().cancel();
}