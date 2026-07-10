/**
 * ollama.service.ts — Shared Ollama HTTP client.
 *
 * CRITICAL: Model name is NEVER hardcoded (Master Doc requirement).
 * Reads from OLLAMA_MODEL and OLLAMA_BASE_URL environment variables.
 * Default: qwen3:4b — can be switched to llama3.2:3b via .env if too slow.
 */

// ---------------------------------------------------------------------------
// Config from environment (NEVER hardcode the model name)
// ---------------------------------------------------------------------------

function getModel(): string {
  return process.env.OLLAMA_MODEL || 'qwen3:4b';
}

function getBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  num_predict?: number;
  stop?: string[];
}

export interface OllamaResponse {
  response: string;
  done: boolean;
  model: string;
  total_duration?: number;
}

// ---------------------------------------------------------------------------
// Core function — calls Ollama /api/generate (non-streaming)
// ---------------------------------------------------------------------------

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: OllamaOptions = {}
): Promise<string> {
  const model = getModel();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/generate`;

  const body = {
    model,
    prompt: userPrompt,
    system: systemPrompt,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      num_predict: options.num_predict ?? 1024,
      ...(options.stop ? { stop: options.stop } : {}),
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000), // 2 minute timeout
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Ollama API error (${response.status}): ${errText}`
      );
    }

    const data = (await response.json()) as OllamaResponse;
    return data.response.trim();
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error(
        `Ollama request timed out after 120s. Model: ${model}. ` +
        `If ${model} is too slow, switch to a smaller model in .env (e.g. OLLAMA_MODEL=llama3.2:3b)`
      );
    }
    throw new Error(`Ollama request failed: ${error.message}`);
  }
}

/**
 * Quick health check — verifies Ollama is reachable and the configured model is available.
 */
export async function checkOllamaHealth(): Promise<{ ok: boolean; model: string; error?: string }> {
  const model = getModel();
  const baseUrl = getBaseUrl();

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
    return {
      ok: false,
      model,
      error: `Cannot reach Ollama at ${baseUrl}. Is it running? Start with: ollama serve`,
    };
  }
}
