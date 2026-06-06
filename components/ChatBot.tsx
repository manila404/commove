
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, Mic, ArrowLeft, X,
} from 'lucide-react';
import type { EventType } from '../types';
import {
  sendChatMessage,
  isChatbotAvailable,
  type ChatMessage,
} from '../services/chatbotService';

interface ChatBotProps {
  events: EventType[];
  onEventSelect: (event: EventType) => void;
  onClose: () => void;
}

// ── Event-link parser ─────────────────────────────────────────────────────────
const EVENT_LINK_RE = /\[([^\]]+)\]\(event:([^)]+)\)/g;
interface Segment { type: 'text' | 'event-link'; content: string; eventId?: string; }

const parseSegments = (text: string): Segment[] => {
  const segs: Segment[] = [];
  let last = 0; let m: RegExpExecArray | null;
  EVENT_LINK_RE.lastIndex = 0;
  while ((m = EVENT_LINK_RE.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', content: text.slice(last, m.index) });
    segs.push({ type: 'event-link', content: m[1], eventId: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: 'text', content: text.slice(last) });
  return segs;
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const CHAT_KEY = 'commove_chat_history';
const WELCOME_ID = '__welcome__';

const ERROR_PREFIXES = [
  'The Gemini API key is invalid',
  "You've hit the API rate limit",
  'Sorry, I ran into an error',
];

const loadMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    const parsed = (JSON.parse(raw) as Array<Omit<ChatMessage, 'timestamp'> & { timestamp: string }>)
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    // Strip any previously saved error messages so they don't linger across sessions
    return parsed.filter(m => !ERROR_PREFIXES.some(p => m.content.startsWith(p)));
  } catch { return []; }
};

const saveMessages = (msgs: ChatMessage[]) => {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs)); } catch { }
};

// ── Animated orb ──────────────────────────────────────────────────────────────
const AnimatedOrb = () => (
  <div className="relative w-[50px] h-[50px] mx-auto mb-3" style={{ aspectRatio: '1' }}>
    <div className="absolute inset-[-10px] rounded-full border-2 border-[#0052A3]/30 animate-ping" />
    <div className="absolute inset-[-5px] rounded-full border border-[#0052A3]/40 animate-pulse" />
    <div className="absolute inset-0 rounded-full animate-pulse" style={{
      background: 'radial-gradient(circle, #93c5fd 0%, #3b82f6 60%, #1d4ed8 100%)',
      filter: 'blur(12px)', transform: 'scale(1.4)', opacity: 0.5,
    }} />
    <div className="absolute inset-0 rounded-full shadow-xl" style={{
      background: 'radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1e40af 100%)',
    }} />
    <div className="absolute top-1.5 left-2 w-3 h-2 rounded-full bg-white opacity-30" style={{ filter: 'blur(3px)' }} />
  </div>
);

// ── Quick action cards ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: 'week',    title: "This Week's Events",   subtitle: 'Events happening this week',
    emoji: '📅', query: "What events are happening this week?",
  },
  {
    id: 'sports',  title: 'Find Sports Events',   subtitle: 'Competitions & leagues',
    emoji: '🏆', query: "Are there any sports events coming up?",
  },
  {
    id: 'weekend', title: 'Weekend Events',        subtitle: 'Saturday & Sunday picks',
    emoji: '🌅', query: "What's happening this weekend?",
  },
  {
    id: 'health',  title: 'Health & Wellness',     subtitle: 'Fitness & wellness events',
    emoji: '🏥', query: "Are there any health and wellness events?",
  },
  {
    id: 'tech',    title: 'Tech & Business',       subtitle: 'Innovation & networking',
    emoji: '💻', query: "Are there any technology or business events?",
  },
  {
    id: 'nearby',  title: 'Events Near You',       subtitle: 'Discover local happenings',
    emoji: '📍', query: "What events are happening near Bacoor?",
  },
];

const INPUT_QUICK_ACTIONS = QUICK_ACTIONS.slice(0, 3);

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-end gap-2 mb-4">
    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
      <Bot size={14} className="text-[#0052A3] dark:text-blue-300" />
    </div>
    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
      <div className="flex gap-1 items-center h-3.5">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const ChatBot: React.FC<ChatBotProps> = ({ events, onEventSelect, onClose }) => {
  const available = isChatbotAvailable();
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveMessages(messages); }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const handleSend = useCallback(async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || isLoading || !available) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setIsLoading(true);
    try {
      const history = messages.filter(m => m.id !== WELCOME_ID);
      const reply = await sendChatMessage(message, events, history);
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date() }]);
    } catch (err: any) {
      let errorMsg = "Sorry, I ran into an error. Please try again.";
      if (err?.message === 'RATE_LIMIT') errorMsg = "You've hit the API quota limit. Please wait a moment and try again.";
      if (err?.message === 'INVALID_KEY') errorMsg = "There was an authentication error with the AI service. Please contact the administrator.";
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: errorMsg, timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  }, [input, isLoading, available, messages, events]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const chatMessages = messages.filter(m => m.id !== WELCOME_ID);
  const hasChat = chatMessages.length > 0 || isLoading;

  // ── Shared input bar ──────────────────────────────────────────────────────
  const InputBar = (
    <div className="flex-shrink-0 bg-white dark:bg-gray-950 px-4 pt-3 pb-4 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask me anything about events..."
          className="flex-1 text-sm px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:border-[#0052A3] dark:focus:border-blue-400 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="w-9 h-9 rounded-full bg-[#0052A3] hover:bg-[#004482] disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white disabled:text-gray-400 flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed flex-shrink-0">
          <Send size={14} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 mt-2 px-1 overflow-x-auto no-scrollbar">
        <button className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0">
          <Mic size={12} /><span>Voice Record</span>
        </button>
        {INPUT_QUICK_ACTIONS.map(action => (
          <button
            key={action.id}
            type="button"
            onClick={() => handleSend(action.query)}
            disabled={isLoading || !available}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-[#0052A3] dark:hover:bg-blue-900/30 dark:hover:text-blue-300 text-[10px] font-medium transition-colors disabled:opacity-50"
          >
            {action.title}
          </button>
        ))}
        {chatMessages.length > 0 && (
          <button
            onClick={() => { localStorage.removeItem(CHAT_KEY); setMessages([]); }}
            className="ml-auto text-[11px] text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
            Clear chat
          </button>
        )}
      </div>
    </div>
  );

  // ── Page layout ───────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-white dark:bg-gray-950">

      {/* Global Header with Back and Close button */}
      <div className="pt-safe md:pt-3 flex items-center gap-3 px-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white/80 dark:bg-gray-950 z-10">
        {hasChat && (
          <button onClick={() => setMessages([])} title="Back to welcome"
            className="p-2 -ml-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'radial-gradient(circle at 35% 30%, #93c5fd, #0052A3 60%, #003f7f 100%)' }}>
          <Bot size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">Commove Assistant</p>
          <p className="text-xs text-gray-400 mt-0.5">Events in Bacoor, Cavite</p>
        </div>
        <button onClick={onClose} title="Close Chat"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* ── WELCOME STATE — scrollable and compact ── */}
      {!hasChat && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

          {/* Orb + heading — compact padding */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-5 pt-12 pb-8">
            <AnimatedOrb />
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-snug">
              Hi! I'm your Assistant.<br />How can I help you today?
            </h1>
            <p className="mt-1 text-xs text-gray-400 max-w-xs leading-relaxed">
              Ask me anything about events in Bacoor and I'll provide real-time answers
            </p>
          </div>

        </div>
      )}

      {/* ── CHAT STATE ── */}
      {hasChat && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0" style={{ scrollbarWidth: 'thin' }}>
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-2 mb-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 self-end"
                    style={{ background: 'radial-gradient(circle at 35% 30%, #93c5fd, #0052A3 60%, #003f7f 100%)' }}>
                    <Bot size={11} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-[#0052A3] text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                }`}>
                  {msg.role === 'user'
                    ? msg.content
                    : parseSegments(msg.content).map((seg, i) =>
                        seg.type === 'event-link' ? (
                          <button key={i}
                            onClick={() => { const ev = events.find(e => e.id === seg.eventId); if (ev) onEventSelect(ev); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-lg bg-[#0052A3] hover:bg-[#004482] text-white text-xs font-medium transition-colors active:scale-95">
                            {seg.content} ↗
                          </button>
                        ) : <span key={i}>{seg.content}</span>
                      )
                  }
                </div>
              </div>
            ))}
            {isLoading && <TypingDots />}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      {InputBar}
    </div>
  );
};

export default ChatBot;
