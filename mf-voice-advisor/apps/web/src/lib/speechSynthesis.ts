export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error('Speech Synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const indianEnglish = voices.find(v => v.lang === 'en-IN');
    const ukEnglish = voices.find(v => v.lang === 'en-GB' || v.lang === 'en-UK');
    const usEnglish = voices.find(v => v.lang === 'en-US');
    
    if (indianEnglish) utterance.voice = indianEnglish;
    else if (ukEnglish) utterance.voice = ukEnglish;
    else if (usEnglish) utterance.voice = usEnglish;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}

export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
}
