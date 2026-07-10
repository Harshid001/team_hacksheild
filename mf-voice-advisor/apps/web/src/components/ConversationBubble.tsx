import { Bot, User } from 'lucide-react';
import { clsx } from 'clsx';

interface ConversationBubbleProps {
  type: 'bot' | 'user';
  text: string;
  isLatest?: boolean;
  isStreaming?: boolean;
}

export function ConversationBubble({ type, text, isLatest, isStreaming }: ConversationBubbleProps) {
  const isBot = type === 'bot';

  return (
    <div 
      className={clsx(
        "flex w-full gap-4 max-w-4xl mx-auto",
        isBot ? "justify-start" : "justify-end",
        isLatest && "animate-in slide-in-from-bottom-4 fade-in duration-500"
      )}
    >
      {/* Bot Avatar (Left) */}
      {isBot && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Bot size={20} />
        </div>
      )}

      {/* Message Bubble */}
      <div 
        className={clsx(
          "px-6 py-4 rounded-2xl max-w-[80%] text-[1.05rem] leading-relaxed shadow-lg relative",
          isBot 
            ? "glass-panel rounded-tl-sm border-l-2 border-l-indigo-400 text-slate-200" 
            : "bg-emerald-900/40 border border-emerald-500/30 rounded-tr-sm text-emerald-50"
        )}
      >
        {text}
        {/* Streaming cursor */}
        {isStreaming && (
          <span className="inline-block w-2 h-5 ml-1 bg-indigo-400 animate-pulse rounded-sm align-middle" />
        )}
      </div>

      {/* User Avatar (Right) */}
      {!isBot && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
          <User size={20} />
        </div>
      )}
    </div>
  );
}
