import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startChatStream, sendMessageStream, getChatProfile } from '../lib/api';
import { createSpeechRecognition, isSpeechRecognitionSupported } from '../lib/speechRecognition';
import { speak, cancelSpeech } from '../lib/speechSynthesis';
import { ConversationBubble } from '../components/ConversationBubble';
import { MicButton } from '../components/MicButton';
import { ListeningIndicator } from '../components/ListeningIndicator';
import { Send, FileText, Loader2 } from 'lucide-react';

interface ChatMsg {
  id: string;
  type: 'bot' | 'user';
  text: string;
  isStreaming?: boolean;
}

export function ConversationPage() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  
  // States
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Refs
  const sessionIdRef = useRef<string | null>(null);
  const isCompleteRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
    isCompleteRef.current = isComplete;
  }, [sessionId, isComplete]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isProcessing]);

  // Update streaming message text
  const updateStreamingMsg = useCallback((msgId: string, newText: string) => {
    setHistory(prev => prev.map(msg => 
      msg.id === msgId ? { ...msg, text: newText } : msg
    ));
  }, []);

  // Finalize streaming message
  const finalizeStreamingMsg = useCallback((msgId: string, finalText: string) => {
    setHistory(prev => prev.map(msg => 
      msg.id === msgId ? { ...msg, text: finalText, isStreaming: false } : msg
    ));
    streamingMsgIdRef.current = null;
  }, []);

  // Check profile completion
  const checkProfileCompletion = useCallback(async (sid: string) => {
    try {
      const profile = await getChatProfile(sid);
      if (profile.isComplete) {
        setIsComplete(true);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Init Conversation — AI generates the greeting via LLM
  useEffect(() => {
    async function init() {
      try {
        const streamingId = `bot-${Date.now()}`;
        
        // Add an empty streaming bot message
        setHistory([{ id: streamingId, type: 'bot', text: '', isStreaming: true }]);
        streamingMsgIdRef.current = streamingId;

        let accumulatedText = '';

        await startChatStream({
          onSessionId: (sid) => {
            setSessionId(sid);
            sessionIdRef.current = sid;
          },
          onToken: (token) => {
            accumulatedText += token;
            updateStreamingMsg(streamingId, accumulatedText);
          },
          onDone: async (fullMessage) => {
            finalizeStreamingMsg(streamingId, fullMessage);
            setIsProcessing(false);
            // Read the greeting aloud
            await speak(fullMessage);
          },
          onError: (error) => {
            console.error('Chat start error:', error);
            finalizeStreamingMsg(streamingId, `Connection error: ${error}`);
            setIsProcessing(false);
          },
        });
      } catch (err) {
        console.error('Failed to start chat:', err);
        setIsProcessing(false);
      }
    }
    init();

    // Setup speech recognition
    if (isSpeechRecognitionSupported()) {
      recognitionRef.current = createSpeechRecognition();
      recognitionRef.current.onResult = (transcript: string) => {
        setInterimTranscript(transcript);
      };
      
      recognitionRef.current.onEnd = (lastTranscript: string) => {
        setIsListening(false);
        setInterimTranscript('');
        if (lastTranscript && lastTranscript.trim()) {
          handleUserSubmit(lastTranscript);
        }
      };
      recognitionRef.current.onError = (err: string) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };
    }

    return () => {
      cancelSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      cancelSpeech();
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleUserSubmit = async (text: string) => {
    const currentSessionId = sessionIdRef.current;
    if (!text.trim() || !currentSessionId) return;
    
    // Add user message
    const userMsgId = `user-${Date.now()}`;
    setHistory(prev => [...prev, { id: userMsgId, type: 'user', text }]);
    setTextInput('');
    setIsProcessing(true);

    // Add streaming bot message placeholder
    const botMsgId = `bot-${Date.now()}`;
    setHistory(prev => [...prev, { id: botMsgId, type: 'bot', text: '', isStreaming: true }]);
    streamingMsgIdRef.current = botMsgId;

    let accumulatedText = '';

    try {
      await sendMessageStream(currentSessionId, text, {
        onToken: (token) => {
          accumulatedText += token;
          updateStreamingMsg(botMsgId, accumulatedText);
        },
        onToolCall: (name, result) => {
          // Check for profile completion when profile is updated
          if (name === 'updateUserProfile' && result?.isComplete) {
            setIsComplete(true);
          }
        },
        onDone: async (fullMessage) => {
          finalizeStreamingMsg(botMsgId, fullMessage);
          setIsProcessing(false);
          // Check profile completion
          await checkProfileCompletion(currentSessionId);
          // Read response aloud
          await speak(fullMessage);
        },
        onError: (error) => {
          console.error('Chat error:', error);
          finalizeStreamingMsg(botMsgId, `Connection error: ${error}`);
          setIsProcessing(false);
        },
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      finalizeStreamingMsg(botMsgId, 'Failed to get AI response. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col relative z-10 overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-white/10 glass-panel shrink-0">
        <h1 className="text-xl font-bold text-slate-100 flex items-center justify-between">
          <span className="text-gradient">Advisor Chat</span>
          {isComplete && (
            <span className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              Profile Complete
            </span>
          )}
        </h1>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6 pb-32">
          {history.map((msg, idx) => (
            <ConversationBubble 
              key={msg.id} 
              type={msg.type} 
              text={msg.text} 
              isLatest={idx === history.length - 1}
              isStreaming={msg.isStreaming}
            />
          ))}
          {/* Show loader only when processing and no streaming message visible */}
          {isProcessing && !streamingMsgIdRef.current && history.length === 0 && (
            <div className="flex justify-start">
              <div className="glass-panel px-6 py-4 rounded-2xl rounded-tl-sm border-l-2 border-indigo-400 flex items-center gap-3 text-indigo-300">
                <Loader2 size={18} className="animate-spin" />
                Connecting to AI...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Control Area (Bottom fixed) */}
      <div className="p-6 bg-background/80 backdrop-blur-xl border-t border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto">
          {isComplete ? (
            <div className="flex flex-col items-center justify-center py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="text-emerald-400 mb-6 font-medium">All information gathered successfully!</p>
              <button 
                onClick={() => navigate(`/report/${sessionId}`)}
                className="btn-primary flex items-center gap-2 text-lg px-8"
              >
                <FileText size={20} />
                Generate My Report
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Voice Controls */}
              <div className="flex flex-col items-center gap-4">
                <ListeningIndicator isListening={isListening} />
                
                {/* Live Transcript Display */}
                {isListening && interimTranscript && (
                  <div className="max-w-xl text-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-200 italic shadow-inner animate-in fade-in">
                    "{interimTranscript}"
                  </div>
                )}
                
                {isSpeechRecognitionSupported() ? (
                  <MicButton 
                    isListening={isListening} 
                    onClick={toggleListening} 
                    disabled={isProcessing}
                  />
                ) : (
                  <p className="text-amber-400 text-sm mb-4">Voice recognition not supported in this browser. Please type below.</p>
                )}
              </div>

              {/* Text Input */}
              <form 
                className="w-full flex gap-3 relative"
                onSubmit={(e) => { e.preventDefault(); handleUserSubmit(textInput); }}
              >
                <input 
                  type="text" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                  placeholder="Or type your answer here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={isProcessing || isListening}
                />
                <button 
                  type="submit"
                  disabled={!textInput.trim() || isProcessing || isListening}
                  className="absolute right-2 top-2 bottom-2 aspect-square rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center transition-colors"
                >
                  <Send size={18} className="text-white ml-1" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
