
import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isRoleplayActive?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isLoading, isRoleplayActive }) => {
  const [input, setInput] = React.useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // Helper to highlight asterisks text
  const formatMessage = (text: string) => {
    const parts = text.split(/(\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={i} className="italic opacity-60 text-xs block my-1">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`flex flex-col h-full glass rounded-2xl overflow-hidden transition-all duration-500 border ${isRoleplayActive ? 'border-pink-500/30' : 'border-white/10'}`}>
      <div className={`p-4 border-b flex justify-between items-center transition-colors duration-500 ${isRoleplayActive ? 'bg-pink-500/10 border-pink-500/20' : 'bg-white/10 border-white/10'}`}>
        <h3 className={`font-bold tracking-wider transition-colors ${isRoleplayActive ? 'text-pink-400' : 'text-cyan-400'}`}>
          {isRoleplayActive ? 'NARRATIVE LOG' : 'LIVE CHAT'}
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isRoleplayActive ? 'bg-pink-500 shadow-[0_0_8px_#ec4899]' : 'bg-red-500'}`}></div>
          <span className="text-[10px] text-white/50 uppercase tracking-tighter">
            {isRoleplayActive ? 'Session Active' : 'REC'}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm transition-all ${
              msg.role === 'user' 
                ? 'bg-cyan-500/10 text-cyan-100 rounded-tr-none border border-cyan-500/30 shadow-[0_2px_10px_rgba(34,211,238,0.05)]' 
                : `${isRoleplayActive ? 'bg-pink-500/15 border-pink-500/30 text-pink-50' : 'bg-purple-500/20 border-purple-500/30 text-purple-100'} rounded-tl-none`
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold text-[9px] uppercase opacity-50 ${msg.role === 'user' ? 'text-cyan-400' : (isRoleplayActive ? 'text-pink-400' : 'text-purple-400')}`}>
                  {msg.role === 'user' ? 'Identity_User' : 'Identity_Astra'}
                </span>
                <span className="text-[9px] opacity-30 font-mono">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="leading-relaxed">
                {formatMessage(msg.text)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`${isRoleplayActive ? 'bg-pink-500/20 border-pink-500/30' : 'bg-purple-500/20 border-purple-500/30'} p-3 rounded-2xl rounded-tl-none border`}>
              <div className="flex space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isRoleplayActive ? 'bg-pink-400' : 'bg-purple-400'}`} style={{ animationDelay: '0ms' }}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isRoleplayActive ? 'bg-pink-400' : 'bg-purple-400'}`} style={{ animationDelay: '150ms' }}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isRoleplayActive ? 'bg-pink-400' : 'bg-purple-400'}`} style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`p-4 transition-colors duration-500 ${isRoleplayActive ? 'bg-pink-500/5' : 'bg-black/20'}`}>
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isRoleplayActive ? "Describe your action or speak..." : "Type your message..."}
            className={`w-full bg-white/5 border rounded-xl py-3 px-4 pr-12 text-sm text-white placeholder-white/20 focus:outline-none transition-all ${isRoleplayActive ? 'border-pink-500/30 focus:border-pink-500/60' : 'border-white/10 focus:border-cyan-500/50'}`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center transition-colors ${isRoleplayActive ? 'text-pink-400 hover:text-pink-300' : 'text-cyan-400 hover:text-cyan-300'} disabled:opacity-30`}
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
