/**
 * stt.service.ts
 *
 * Backend Whisper wrapper for Speech-to-Text.
 *
 * Supports two backends (set via WHISPER_BACKEND env var):
 *   "faster-whisper"  — recommended, Python CLI (pip install faster-whisper)
 *   "whisper-cpp"     — alternative, C++ binary (see WHISPER_SETUP.md)
 *
 * All config from env vars — nothing hardcoded.
 * See apps/api/src/services/WHISPER_SETUP.md for setup instructions.
 */

import "dotenv/config";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

// ─── Configuration ────────────────────────────────────────────────────────────

/** Which Whisper backend to use. */
type WhisperBackend = "faster-whisper" | "whisper-cpp";

const getBackend = () => (process.env.WHISPER_BACKEND ?? "faster-whisper") as WhisperBackend;
const getModel = () => process.env.WHISPER_MODEL ?? "base";
const getCppBinary = () => process.env.WHISPER_CPP_BINARY ?? "./whisper.cpp/main";
const getCppModel = () => process.env.WHISPER_CPP_MODEL ?? "./whisper.cpp/models/ggml-base.bin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscribeResult {
    transcript: string;
    backend: WhisperBackend;
    durationMs: number;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Build the command and args for the selected Whisper backend.
 * Returns [command, args[]] ready for spawn().
 */
function buildWhisperCommand(audioFilePath: string): [string, string[]] {
    if (getBackend() === "whisper-cpp") {
        // whisper.cpp: ./main -m models/ggml-base.bin -f audio.wav --output-txt --no-timestamps
        return [
            getCppBinary(),
            [
                "-m", getCppModel(),
                "-f", audioFilePath,
                "--output-txt",
                "--no-timestamps",
                "-l", "en",
            ],
        ];
    }

    // faster-whisper (default): faster-whisper audio.wav --model base --language en
    return [
        "faster-whisper",
        [
            audioFilePath,
            "--model", getModel(),
            "--language", "en",
            "--output_format", "txt",
            "--output_dir", path.dirname(audioFilePath),
        ],
    ];
}

/**
 * For faster-whisper, the transcript is written to a .txt sidecar file.
 * For whisper.cpp with --output-txt, it also writes a sidecar.
 * This helper reads and cleans it.
 */
async function readSidecarTranscript(audioFilePath: string): Promise<string> {
    const base = audioFilePath.replace(/\.[^/.]+$/, "");
    const txtPath = `${base}.txt`;
    try {
        const raw = await fs.readFile(txtPath, "utf-8");
        await fs.unlink(txtPath).catch(() => { }); // clean up
        return raw.trim();
    } catch {
        return "";
    }
}

/**
 * Parse inline stdout transcript (whisper.cpp without --output-txt,
 * or as a fallback if sidecar file wasn't created).
 *
 * whisper.cpp stdout format example:
 *   [00:00:00.000 --> 00:00:03.500]  I want to invest in mutual funds.
 */
function parseInlineTranscript(stdout: string): string {
    return stdout
        .split("\n")
        .map((line) => {
            // Strip timestamp brackets if present: [00:00:00.000 --> 00:00:03.500]
            return line.replace(/^\[[\d:., >-]+\]\s*/g, "").trim();
        })
        .filter(Boolean)
        .join(" ")
        .trim();
}

/**
 * Run the Whisper process and resolve with stdout + stderr.
 * Rejects if the process exits with non-zero code.
 */
function runProcess(
    command: string,
    args: string[]
): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            env: { ...process.env },
            // Windows needs shell:true to find Python scripts in PATH
            shell: process.platform === "win32",
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString();
        });

        proc.stderr.on("data", (chunk: Buffer) => {
            // faster-whisper logs progress to stderr — capture but don't fail on it
            stderr += chunk.toString();
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(
                    new Error(
                        `Whisper process exited with code ${code}.\nSTDERR: ${stderr.slice(0, 500)}`
                    )
                );
            }
        });

        proc.on("error", (err) => {
            reject(
                new Error(
                    `Failed to spawn Whisper process ("${command}"): ${err.message}. ` +
                    `Is ${getBackend()} installed? See WHISPER_SETUP.md.`
                )
            );
        });
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Transcribe an audio file using the local Whisper instance.
 *
 * @param audioFilePath  Absolute path to the audio file (WAV recommended,
 *                       faster-whisper also accepts WebM/MP4)
 * @returns TranscribeResult with the transcript text and diagnostics
 * @throws Error if Whisper is not installed or transcription fails
 */
export async function transcribe(audioFilePath: string): Promise<TranscribeResult> {
    const startMs = Date.now();
    const [command, args] = buildWhisperCommand(audioFilePath);

    console.log(`[stt.service] Transcribing with ${getBackend()}: ${path.basename(audioFilePath)}`);

    const { stdout } = await runProcess(command, args);

    // Try sidecar file first (more reliable), fall back to stdout parsing
    let transcript = await readSidecarTranscript(audioFilePath);
    if (!transcript) {
        transcript = parseInlineTranscript(stdout);
    }

    const durationMs = Date.now() - startMs;
    console.log(`[stt.service] Transcription complete in ${durationMs}ms: "${transcript.slice(0, 80)}"`);

    return {
        transcript,
        backend: getBackend(),
        durationMs,
    };
}

/**
 * Convenience wrapper: write a Buffer to a temp file, transcribe it,
 * then delete the temp file. Used by the WebSocket handler.
 *
 * @param buffer    Raw audio bytes (WAV, WebM, MP4)
 * @param ext       File extension without dot, e.g. "wav" or "webm"
 */
export async function transcribeBuffer(
    buffer: Buffer,
    ext = "wav"
): Promise<TranscribeResult> {
    const tmpPath = path.join(os.tmpdir(), `mf-stt-${Date.now()}.${ext}`);
    await fs.writeFile(tmpPath, buffer);
    try {
        return await transcribe(tmpPath);
    } finally {
        await fs.unlink(tmpPath).catch(() => { }); // always clean up
    }
}

export async function isWhisperAvailable(): Promise<boolean> {
    const backend = getBackend();
    const checkCmd = backend === "whisper-cpp" ? getCppBinary() : "faster-whisper";
    const versionArgs = backend === "whisper-cpp" ? ["--version"] : ["--help"];
    try {
        await runProcess(checkCmd, versionArgs);
        return true;
    } catch {
        return false;
    }
}
