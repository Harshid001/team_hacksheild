import type { 
  ReportData,
  ChatStreamEvent,
  ChatMessageData,
} from 'shared/types';

// Vite proxies /api to the backend
const API_BASE = '/api';

// ---------------------------------------------------------------------------
// Chat API — SSE streaming
// ---------------------------------------------------------------------------

/**
 * Start a new chat session. Streams the AI greeting via SSE.
 * Returns sessionId and calls onToken/onDone callbacks.
 */
export async function startChatStream(callbacks: {
  onSessionId: (sessionId: string) => void;
  onToken: (token: string) => void;
  onDone: (fullMessage: string) => void;
  onError: (error: string) => void;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start chat');
  
  await processSSEStream(res, callbacks);
}

/**
 * Send a message and stream the AI response via SSE.
 */
export async function sendMessageStream(
  sessionId: string,
  message: string,
  callbacks: {
    onToken: (token: string) => void;
    onToolCall?: (name: string, result: any) => void;
    onDone: (fullMessage: string) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  
  if (!res.ok) throw new Error('Failed to send message');
  
  await processSSEStream(res, {
    ...callbacks,
    onSessionId: () => {}, // Not needed for message endpoint
  });
}

/**
 * Process an SSE stream response from the backend.
 */
async function processSSEStream(
  response: Response,
  callbacks: {
    onSessionId?: (sessionId: string) => void;
    onToken: (token: string) => void;
    onToolCall?: (name: string, result: any) => void;
    onDone: (fullMessage: string) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullMessage = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Process complete SSE lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6); // Remove 'data: ' prefix
      
      if (data === '[DONE]') {
        callbacks.onDone(fullMessage);
        return;
      }

      try {
        const event: ChatStreamEvent = JSON.parse(data);

        switch (event.type) {
          case 'session':
            callbacks.onSessionId?.(event.sessionId);
            break;
          case 'token':
            fullMessage += event.content;
            callbacks.onToken(event.content);
            break;
          case 'tool_call':
            callbacks.onToolCall?.(event.toolCall.name, (event as any).toolResult);
            break;
          case 'done':
            if (event.content) fullMessage = event.content;
            // Don't call onDone yet — wait for [DONE]
            break;
          case 'error':
            callbacks.onError(event.content);
            return;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  // If stream ended without [DONE], still call onDone
  if (fullMessage) {
    callbacks.onDone(fullMessage);
  }
}

/**
 * Get full chat history for a session.
 */
export async function getChatMessages(sessionId: string): Promise<{ messages: ChatMessageData[]; status: string }> {
  const res = await fetch(`${API_BASE}/chat/${sessionId}/messages`);
  if (!res.ok) throw new Error('Failed to get messages');
  return res.json();
}

/**
 * Get user profile state for a session.
 */
export async function getChatProfile(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/${sessionId}/profile`);
  if (!res.ok) throw new Error('Failed to get profile');
  return res.json();
}

// ---------------------------------------------------------------------------
// Report API — unchanged
// ---------------------------------------------------------------------------

export async function generateReport(sessionId: string): Promise<ReportData> {
  const res = await fetch(`${API_BASE}/report/${sessionId}/generate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

export async function getReport(sessionId: string): Promise<ReportData> {
  const res = await fetch(`${API_BASE}/report/${sessionId}`);
  if (!res.ok) throw new Error('Failed to get report');
  return res.json();
}
