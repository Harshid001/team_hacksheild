export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export interface SpeechRecognitionWrapper {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export function createSpeechRecognition(): SpeechRecognitionWrapper {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    throw new Error('Speech Recognition is not supported in this browser.');
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-IN'; // Indian English
  
  let finalTranscript = '';

  const wrapper: SpeechRecognitionWrapper = {
    start: () => {
      finalTranscript = '';
      try {
        recognition.start();
      } catch (e) {
        console.error("Speech recognition start error:", e);
      }
    },
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
    onResult: () => {}, // overridden by consumer
    onError: () => {},  // overridden by consumer
    onEnd: () => {}     // overridden by consumer
  };

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
        wrapper.onResult(finalTranscript, true);
      } else {
        interimTranscript += event.results[i][0].transcript;
        wrapper.onResult(finalTranscript + interimTranscript, false);
      }
    }
  };

  recognition.onerror = (event: any) => {
    wrapper.onError(event.error);
  };

  recognition.onend = () => {
    wrapper.onEnd();
  };

  return wrapper;
}
