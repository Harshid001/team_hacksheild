/**
 * conversation.socket.ts — WebSocket event handlers via Socket.io
 *
 * Events (Master Doc Section 6):
 *   client → server: "user_speech"           — { sessionId, transcript }
 *   server → client: "bot_question"          — { question, fieldTargeted }
 *   server → client: "conversation_complete" — { sessionId }
 */

import { Server, Socket } from 'socket.io';
import { processAnswer } from '../services/conversation.service';

export const setupConversationSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Handle incoming speech transcript from the client
    socket.on('user_speech', async (payload: { sessionId: string; transcript: string }) => {
      try {
        const { sessionId, transcript } = payload;

        if (!sessionId || !transcript) {
          socket.emit('error', { message: 'sessionId and transcript are required' });
          return;
        }

        console.log(`🎤 [${sessionId}] Speech received: "${transcript.substring(0, 50)}..."`);

        // Process the answer through the conversation service
        const result = await processAnswer(sessionId, transcript);

        if (result.isComplete) {
          // Conversation is done — all fields filled, risk classified
          socket.emit('conversation_complete', { sessionId });
          console.log(`✅ [${sessionId}] Conversation complete`);
        } else {
          // Send next question back to client
          socket.emit('bot_question', {
            question: result.nextQuestion,
            fieldTargeted: result.fieldTargeted,
          });
          console.log(`💬 [${sessionId}] Next question (${result.fieldTargeted}): "${result.nextQuestion.substring(0, 50)}..."`);
        }
      } catch (error: any) {
        console.error('Socket error processing user speech:', error);
        socket.emit('error', {
          message: 'Failed to process speech',
          detail: error.message,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};
