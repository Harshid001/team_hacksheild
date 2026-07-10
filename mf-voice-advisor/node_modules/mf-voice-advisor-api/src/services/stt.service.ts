/**
 * stt.service.ts — Speech-to-Text Service
 *
 * Primary STT is handled BROWSER-SIDE via Web Speech API (see web/src/lib/speechRecognition.ts).
 * This server-side module provides a stub for the whisper.cpp fallback path.
 *
 * In the core demo flow, STT happens in the browser and the transcript arrives
 * at the server as text via WebSocket ("user_speech" event) or REST body.
 */

export interface STTResult {
  transcript: string;
  confidence: number;
  source: 'web-speech-api' | 'whisper' | 'manual';
}

/**
 * Process an audio blob server-side using whisper.cpp.
 * Currently a stub — the primary path uses browser Web Speech API.
 *
 * For hackathon demo: the frontend sends the transcript text directly,
 * so this function is a fallback that won't be called in the core flow.
 */
export async function transcribeAudio(audioBlob: Buffer): Promise<STTResult> {
  // TODO: Integrate whisper.cpp if server-side STT is needed
  // For now, return a message indicating to use browser-side STT
  console.warn(
    'Server-side STT called but whisper.cpp is not yet integrated. ' +
    'Using Web Speech API in the browser instead.'
  );

  return {
    transcript: '',
    confidence: 0,
    source: 'whisper',
  };
}

/**
 * Wrap a manually typed or browser-transcribed text as an STT result.
 */
export function wrapTranscript(text: string, source: 'web-speech-api' | 'manual' = 'web-speech-api'): STTResult {
  return {
    transcript: text,
    confidence: 1.0,
    source,
  };
}
