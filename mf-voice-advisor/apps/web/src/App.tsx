/**
 * ============================================================
 * App.tsx  — FundWise: AI Voice-Driven Mutual Fund Advisor
 * ============================================================
 *
 * HOW TO SWAP MOCKED LOGIC FOR REAL API CALLS
 * --------------------------------------------
 *
 * 1. CONVERSATION (LLM via WebSocket):
 *    File: src/lib/api.ts  →  connectSocket(sessionId)
 *    - Replace the mock state machine in ConversationPage.tsx with
 *      socket events: emit "user_speech", listen for "bot_question"
 *      and "conversation_complete" per the API contract in MASTER_DOC §6.
 *
 * 2. REPORT DATA:
 *    File: src/lib/api.ts  →  fetchReport(sessionId)
 *    - Already wired to GET /api/report/:sessionId.
 *    - Returns { report } as defined in packages/shared/src/types.ts.
 *
 * 3. STT (server-side Whisper):
 *    File: src/lib/speechRecognition.ts
 *    - POST audio blob to /api/conversation/:sessionId/answer
 *      (body: { audioBlob }) — server runs Whisper, returns transcript.
 *    - Current code uses Web Speech API as the default fallback.
 *
 * 4. SESSION CREATION:
 *    File: src/lib/api.ts  →  startSession()
 *    - POST /api/conversation/start  →  { sessionId }
 *    - Store sessionId in React state; pass to all subsequent calls.
 * ============================================================
 */

import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function App() {
  return <RouterProvider router={router} />
}
