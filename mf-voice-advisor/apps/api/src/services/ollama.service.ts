/**
 * ollama.service.ts — Centralized AI Client (OpenAI-compatible API via Ollama)
 *
 * ALL AI requests in this project go through this single module.
 * Uses the `openai` SDK pointing at Ollama's OpenAI-compatible endpoint.
 *
 * Supports:
 *   - Simple system+user chat completions (backward compat)
 *   - Multi-message conversations with full history
 *   - Streaming variants for both
 *   - Tool/function calling
 *   - Health checks
 *
 * Environment Variables:
 *   OLLAMA_BASE_URL  — default: http://localhost:11434/v1
 *   OLLAMA_API_KEY   — default: "ollama" (Ollama ignores it for local requests)
 *   OLLAMA_MODEL     — default: qwen3:4b
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionChunk,
} from 'openai/resources/chat/completions';

// ---------------------------------------------------------------------------
// Custom error class — granular error categorization
// ---------------------------------------------------------------------------

export type OllamaErrorCode =
  | 'CONNECTION_REFUSED'
  | 'MODEL_NOT_FOUND'
  | 'TIMEOUT'
  | 'API_ERROR';

export class OllamaError extends Error {
  public readonly code: OllamaErrorCode;
  public readonly model: string;
  public readonly statusCode?: number;

  constructor(code: OllamaErrorCode, message: string, model: string, statusCode?: number) {
    super(message);
    this.name = 'OllamaError';
    this.code = code;
    this.model = model;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Config from environment (NEVER hardcode the model name)
// ---------------------------------------------------------------------------

function getModel(): string {
  return process.env.OLLAMA_MODEL || 'qwen3:4b';
}

function getBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
}

function getApiKey(): string {
  return process.env.OLLAMA_API_KEY || 'ollama';
}

// ---------------------------------------------------------------------------
// Singleton OpenAI client — lazily initialized, reused across requests
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;

/**
 * Get or create the singleton OpenAI client configured for Ollama.
 * Exported so other modules can use it directly if needed (e.g., embeddings).
 */
export function getOllamaClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: getBaseUrl(),
      apiKey: getApiKey(),
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  num_predict?: number;
  num_ctx?: number;
  stop?: string[];
}

// Re-export useful OpenAI types for convenience
export type { ChatCompletionMessageParam, ChatCompletionTool };

// ---------------------------------------------------------------------------
// Error classifier — maps raw errors to OllamaError with actionable messages
// ---------------------------------------------------------------------------

function classifyError(error: any, model: string): OllamaError {
  const msg = error?.message?.toLowerCase() || '';
  const statusCode = error?.status || error?.statusCode;

  // Connection refused — Ollama is not running
  if (
    msg.includes('econnrefused') ||
    msg.includes('connect econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('enotfound')
  ) {
    return new OllamaError(
      'CONNECTION_REFUSED',
      `Cannot connect to Ollama. Is it running?\n` +
      `  Start it with: ollama serve\n` +
      `  Expected at: ${getBaseUrl()}`,
      model
    );
  }

  // Timeout
  if (
    msg.includes('timeout') ||
    msg.includes('timedout') ||
    msg.includes('aborted') ||
    error?.name === 'TimeoutError' ||
    error?.name === 'AbortError'
  ) {
    return new OllamaError(
      'TIMEOUT',
      `Ollama request timed out (model: ${model}). ` +
      `If ${model} is too slow, switch to a smaller model via OLLAMA_MODEL in .env ` +
      `(e.g., OLLAMA_MODEL=llama3.2:3b)`,
      model
    );
  }

  // Model not found (404 from Ollama)
  if (
    statusCode === 404 ||
    msg.includes('model') && (msg.includes('not found') || msg.includes('does not exist'))
  ) {
    return new OllamaError(
      'MODEL_NOT_FOUND',
      `Model "${model}" not found in Ollama.\n` +
      `  Pull it with: ollama pull ${model}\n` +
      `  Or change OLLAMA_MODEL in .env to a model you have installed.`,
      model,
      404
    );
  }

  // Generic API error
  return new OllamaError(
    'API_ERROR',
    `Ollama API error: ${error.message || 'Unknown error'}`,
    model,
    statusCode
  );
}

// ---------------------------------------------------------------------------
// Core function — simple system+user chat completion (non-streaming)
// Backward compatible with existing reportComposer.service.ts usage
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request to Ollama (non-streaming).
 * Simple variant: system + user message only.
 *
 * @param systemPrompt - The system message.
 * @param userPrompt   - The user message.
 * @param options      - Temperature, top_p, num_predict (→ max_tokens), stop sequences.
 * @returns The assistant's response text.
 */
export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: OllamaOptions = {}
): Promise<string> {
  const model = getModel();
  const client = getOllamaClient();

  try {
    const createParams: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.num_predict ?? 1024,
      ...(options.stop ? { stop: options.stop } : {}),
      stream: false,
    };

    if (options.num_ctx) {
      createParams.num_ctx = options.num_ctx; // Some Ollama versions support it at root
      createParams.extra_body = { options: { num_ctx: options.num_ctx } }; // Standard way for OpenAI client to pass non-standard args
    }

    const response = await client.chat.completions.create(createParams, {
      timeout: 120_000, // 2 minute timeout
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    return content.trim();
  } catch (error: any) {
    throw classifyError(error, model);
  }
}

// ---------------------------------------------------------------------------
// Streaming variant — simple system+user (backward compat)
// ---------------------------------------------------------------------------

/**
 * Send a streaming chat completion request to Ollama.
 * Simple variant: system + user message only.
 * Returns an async generator that yields content string chunks.
 */
export async function* chatCompletionStream(
  systemPrompt: string,
  userPrompt: string,
  options: OllamaOptions = {}
): AsyncGenerator<string, void, unknown> {
  const model = getModel();
  const client = getOllamaClient();

  try {
    const createParams: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.num_predict ?? 1024,
      ...(options.stop ? { stop: options.stop } : {}),
      stream: true,
    };

    if (options.num_ctx) {
      createParams.num_ctx = options.num_ctx;
      createParams.extra_body = { options: { num_ctx: options.num_ctx } };
    }

    const stream = await client.chat.completions.create(createParams, {
      timeout: 120_000,
    }) as any;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  } catch (error: any) {
    throw classifyError(error, model);
  }
}

// ---------------------------------------------------------------------------
// Multi-message conversation — streaming with tool support
// ---------------------------------------------------------------------------

export interface StreamChunk {
  type: 'token' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    args: string; // JSON string
  };
  finishReason?: string;
  profileComplete?: boolean;
}

/**
 * Send a streaming chat completion request with full message history.
 * Supports tool/function calling.
 * Yields StreamChunk objects for flexible handling.
 */
export async function* chatMessagesStream(
  messages: ChatCompletionMessageParam[],
  options: OllamaOptions = {},
  tools?: ChatCompletionTool[]
): AsyncGenerator<StreamChunk, void, unknown> {
  const model = getModel();
  const client = getOllamaClient();

  try {
    const createParams: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.num_predict ?? 2048,
      ...(options.stop ? { stop: options.stop } : {}),
      stream: true,
    };

    if (options.num_ctx) {
      createParams.num_ctx = options.num_ctx;
      createParams.extra_body = { options: { num_ctx: options.num_ctx } };
    }

    if (tools && tools.length > 0) {
      createParams.tools = tools;
      createParams.tool_choice = 'auto';
    }

    const stream = await client.chat.completions.create(createParams, {
      timeout: 180_000, // 3 min for complex conversations
    });

    // Accumulate tool calls from stream chunks
    const toolCallAccumulator: Map<number, { id: string; name: string; args: string }> = new Map();

    for await (const chunk of stream as unknown as AsyncIterable<ChatCompletionChunk>) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      // Content token
      const delta = choice.delta;
      if (delta?.content) {
        yield { type: 'token', content: delta.content };
      }

      // Tool call chunks (streamed incrementally)
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallAccumulator.has(idx)) {
            toolCallAccumulator.set(idx, {
              id: tc.id || `call_${idx}`,
              name: tc.function?.name || '',
              args: '',
            });
          }
          const acc = toolCallAccumulator.get(idx)!;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.args += tc.function.arguments;
        }
      }

      // Finish reason
      if (choice.finish_reason) {
        // Emit accumulated tool calls
        if (choice.finish_reason === 'tool_calls' || toolCallAccumulator.size > 0) {
          for (const [, tc] of toolCallAccumulator) {
            yield { type: 'tool_call', toolCall: tc };
          }
        }
        yield { type: 'done', finishReason: choice.finish_reason };
      }
    }
  } catch (error: any) {
    throw classifyError(error, model);
  }
}

/**
 * Non-streaming multi-message chat completion.
 * Supports tool/function calling.
 */
export async function chatMessagesCompletion(
  messages: ChatCompletionMessageParam[],
  options: OllamaOptions = {},
  tools?: ChatCompletionTool[]
): Promise<{
  content: string;
  toolCalls?: Array<{ id: string; name: string; args: any }>;
  finishReason: string;
}> {
  const model = getModel();
  const client = getOllamaClient();

  try {
    const createParams: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.num_predict ?? 2048,
      ...(options.stop ? { stop: options.stop } : {}),
      stream: false,
    };

    if (options.num_ctx) {
      createParams.num_ctx = options.num_ctx;
      createParams.extra_body = { options: { num_ctx: options.num_ctx } };
    }

    if (tools && tools.length > 0) {
      createParams.tools = tools;
      createParams.tool_choice = 'auto';
    }

    const response = await client.chat.completions.create(createParams, {
      timeout: 180_000,
    });

    const choice = response.choices?.[0];
    const content = choice?.message?.content ?? '';
    const finishReason = choice?.finish_reason ?? 'stop';

    let toolCalls: Array<{ id: string; name: string; args: any }> | undefined;
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      toolCalls = choice.message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      }));
    }

    return { content: content.trim(), toolCalls, finishReason };
  } catch (error: any) {
    throw classifyError(error, model);
  }
}

// ---------------------------------------------------------------------------
// Health check — verifies Ollama is reachable and the configured model exists
// ---------------------------------------------------------------------------

/**
 * Quick health check — verifies Ollama is reachable and the configured model is available.
 * Uses the native /api/tags endpoint for richer model info (works regardless of /v1 suffix).
 */
export async function checkOllamaHealth(): Promise<{ ok: boolean; model: string; error?: string }> {
  const model = getModel();
  // Strip /v1 suffix to reach the native Ollama API for tags
  const baseUrl = getBaseUrl().replace(/\/v1\/?$/, '');

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return { ok: false, model, error: `Ollama API returned ${response.status}` };
    }

    const data = await response.json() as { models?: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) || [];
    const modelAvailable = models.some((m) => m.startsWith(model.split(':')[0]));

    if (!modelAvailable) {
      return {
        ok: false,
        model,
        error: `Model "${model}" not found. Available: ${models.join(', ')}. Run: ollama pull ${model}`,
      };
    }

    return { ok: true, model };
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return {
        ok: false,
        model,
        error: `Ollama health check timed out. Is Ollama running? Start with: ollama serve`,
      };
    }

    return {
      ok: false,
      model,
      error: `Cannot reach Ollama at ${baseUrl}. Is it running? Start with: ollama serve`,
    };
  }
}
