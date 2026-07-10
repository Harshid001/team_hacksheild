<<<<<<< HEAD
/**
 * apps/api/src/services/stt.service.ts
 *
 * Local Whisper (whisper.cpp / faster-whisper) wrapper.
 * Accepts audio buffer/blob from frontend, returns transcribed text.
 * Owned by: Member A (Voice/STT Engineer)
 *
 * Uses "base" or "small" Whisper model for near-real-time performance.
 * See README.md in this folder for local setup instructions.
 */

import { spawn } from "child_process";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

// ---------- Env config ----------

// Path to whisper.cpp binary (e.g. ./whisper.cpp/main) or faster-whisper CLI wrapper script
const WHISPER_BIN = process.env.WHISPER_BIN || "whisper.cpp/main";
// Path to the downloaded model file, e.g. models/ggml-base.en.bin
const WHISPER_MODEL_PATH = process.env.WHISPER_MODEL_PATH || "whisper.cpp/models/ggml-base.en.bin";
// Timeout so a stuck process never hangs the request forever
const WHISPER_TIMEOUT_MS = Number(process.env.WHISPER_TIMEOUT_MS || 15000);

export type TranscribeResult = {
  text: string;
  success: boolean;
  error?: string;
};

/**
 * transcribeAudio
 *
 * Accepts a raw audio Buffer (expects 16kHz mono WAV — frontend/caller is
 * responsible for that conversion before calling this, or convert here if
 * ffmpeg is available in your environment).
 *
 * Returns { text, success }. Never throws — callers should check `success`
 * and fall back to the browser Web Speech API on failure (see Design Note
 * in README.md).
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<TranscribeResult> {
  let tempDir: string | null = null;
  let inputPath: string | null = null;

  try {
    tempDir = await mkdtemp(path.join(tmpdir(), "stt-"));
    inputPath = path.join(tempDir, "input.wav");
    await writeFile(inputPath, audioBuffer);

    const text = await runWhisper(inputPath);
    return { text: text.trim(), success: true };
  } catch (err: any) {
    return { text: "", success: false, error: err?.message || "unknown STT error" };
  } finally {
    if (inputPath) {
      unlink(inputPath).catch(() => {});
    }
  }
}

function runWhisper(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // whisper.cpp CLI usage: ./main -m <model> -f <input.wav> -otxt -of <output-prefix>
    const args = [
      "-m",
      WHISPER_MODEL_PATH,
      "-f",
      inputPath,
      "-nt", // no timestamps
      "-l",
      "en",
    ];

    const child = spawn(WHISPER_BIN, args);

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Whisper process timed out"));
    }, WHISPER_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Whisper exited with code ${code}: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}

/**
 * isWhisperAvailable
 *
 * Quick health check the API can call on startup (or per-request) to decide
 * whether to tell the frontend "local Whisper is up" vs silently expecting
 * the frontend to fall back to Web Speech API.
 */
export async function isWhisperAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(WHISPER_BIN, ["--help"]);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(false);
    }, 3000);

    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}
=======
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
>>>>>>> 8e5d35a (add all the frontend changes)
