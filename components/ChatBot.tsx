
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, KeyRound, Eye, EyeOff, Trash2, Check,
  Plus, Globe, BookOpen, Mic, ArrowLeft, X, ArrowUpRight,
} from 'lucide-react';
import type { EventType } from '../types';
import {
  sendChatMessage,
  isChatbotAvailable,
  setApiKey,
  clearApiKey,
  getSavedApiKey,
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

const loadMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Array<Omit<ChatMessage, 'timestamp'> & { timestamp: string }>)
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
};

const saveMessages = (msgs: ChatMessage[]) => {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs)); } catch { }
};

const maskKey = (k: string) =>
  k.length > 8 ? `${k.slice(0, 8)}${'•'.repeat(Math.min(k.length - 8, 20))}` : k;

// ── Animated orb ──────────────────────────────────────────────────────────────
const AnimatedOrb = () => (
  <div className="relative w-[50px] h-[50px] mx-auto mb-3" style={{ aspectRatio: '1' }}>
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

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-end gap-2 mb-4">
    <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
      <Bot size={14} className="text-violet-500" />
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
  const [available, setAvailable] = useState(isChatbotAvailable);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showKeyChars, setShowKeyChars] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveMessages(messages); }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => {
    if (!showKeyPanel) setTimeout(() => inputRef.current?.focus(), 100);
    else setTimeout(() => keyInputRef.current?.focus(), 100);
  }, [showKeyPanel]);

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) { setKeyError('Please enter your API key.'); return; }
    if (trimmed.length < 20) {
      setKeyError('Key is too short. Please paste the full API key.'); return;
    }
    setApiKey(trimmed); setAvailable(true); setKeyInput(''); setKeyError(''); setKeySaved(true);
    setTimeout(() => { setKeySaved(false); setShowKeyPanel(false); }, 1200);
  };

  const handleClearKey = () => {
    clearApiKey(); localStorage.removeItem(CHAT_KEY);
    setAvailable(false); setMessages([]); setShowKeyPanel(false); setKeyInput(''); setKeyError('');
  };

  const clearHistory = () => { localStorage.removeItem(CHAT_KEY); setMessages([]); };

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
      if (err?.message === 'RATE_LIMIT') errorMsg = "You've hit the API rate limit. Please wait a moment and try again.";
      if (err?.message?.includes('API key')) errorMsg = "Your Gemini API key is invalid. Please check it via the Library button.";
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: errorMsg, timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  }, [input, isLoading, available, messages, events]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const chatMessages = messages.filter(m => m.id !== WELCOME_ID);
  const hasChat = chatMessages.length > 0 || isLoading;
  const savedKey = getSavedApiKey();

  // ── Key panel overlay ─────────────────────────────────────────────────────
  const KeyPanel = (
    <div className="absolute inset-0 z-20 bg-black/40 dark:bg-black/60 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {available ? 'Manage API Key' : 'Connect AI Assistant'}
          </p>
          <button onClick={() => setShowKeyPanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
        {!available && (
          <div className="flex flex-col items-center text-center mb-4">
            <AnimatedOrb />
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Enter your Gemini API key to enable the assistant. Get one free at{' '}
              <span className="text-blue-600 font-medium">aistudio.google.com</span>
            </p>
          </div>
        )}
        {available && savedKey && (
          <p className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl mb-4 break-all">
            {maskKey(savedKey)}
          </p>
        )}
        <div className="space-y-3">
          <div className="relative">
            <input ref={keyInputRef} type={showKeyChars ? 'text' : 'password'} value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setKeyError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()} placeholder="Paste your Gemini API key..."
              className="w-full text-sm px-4 py-2.5 pr-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-violet-400 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 font-mono" />
            <button type="button" onClick={() => setShowKeyChars(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showKeyChars ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {keyError && <p className="text-xs text-red-500">{keyError}</p>}
          <button onClick={handleSaveKey}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95">
            {keySaved ? <><Check size={15} /> Saved!</> : <><KeyRound size={15} /> {available ? 'Update Key' : 'Connect'}</>}
          </button>
          {available && (
            <button onClick={handleClearKey}
              className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium flex items-center justify-center gap-2">
              <Trash2 size={14} /> Remove Key
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Shared input bar ──────────────────────────────────────────────────────
  const InputBar = (
    <div className="flex-shrink-0 bg-white dark:bg-gray-950 pt-3 pb-4 md:pb-4 border-t border-gray-100 dark:border-gray-800">
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || !available}
          placeholder={available ? "Ask me anything about events..." : "Connect your API key to start"}
          className="w-full text-sm px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-300 dark:focus:border-blue-700 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors disabled:opacity-50 mb-3 shadow-sm"
        />
        <div className="flex items-center justify-end md:justify-between">
          <div className="hidden md:flex items-center gap-4 text-gray-400 dark:text-gray-500 text-xs">
            <button onClick={() => setShowKeyPanel(true)}
              className="flex items-center gap-1.5 font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <BookOpen size={15} /><span>Library</span>
            </button>
            <button className="flex items-center gap-1.5 font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Mic size={15} /><span>Voice Record</span>
            </button>
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || !available}
            className="w-9 h-9 rounded-full bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-100 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white dark:text-gray-900 disabled:text-gray-400 flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed flex-shrink-0">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  // ── Page layout ───────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-white dark:bg-gray-950">

      {showKeyPanel && KeyPanel}

      {/* Global Header with Back and Close button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white/80 dark:bg-gray-950 z-10">
        {hasChat && (
          <button onClick={() => setMessages([])} title="Back to welcome"
            className="p-2 -ml-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'radial-gradient(circle at 35% 30%, #c4b5fd, #7c3aed 60%, #4338ca 100%)' }}>
          <Bot size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">Commove Assistant</p>
          <p className="text-xs text-gray-400 mt-0.5">{available ? 'Events in Bacoor, Cavite' : 'API key required'}</p>
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
          <div className="flex-shrink-0 flex flex-col items-center justify-center text-center px-5 py-6">
            <AnimatedOrb />
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-snug">
              Hi! I'm your Assistant.<br />How can I help you today?
            </h1>
            <p className="mt-1 text-xs text-gray-400 max-w-xs leading-relaxed">
              Ask me anything about events in Bacoor and I'll provide real-time answers
            </p>
          </div>

          {/* Quick Actions — horizontal snap-scroll */}
          <div className="flex-shrink-0 w-full pb-4">
            <div className="mb-2 px-4 max-w-5xl mx-auto text-center md:text-left">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Actions</span>
            </div>
            <div
              className="flex gap-2.5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory px-4 py-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {QUICK_ACTIONS.map(qa => (
                <button
                  key={qa.id}
                  onClick={() => available ? handleSend(qa.query) : setShowKeyPanel(true)}
                  className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md active:scale-[0.99] transition-all snap-start flex-shrink-0 w-[180px]"
                >
                  {/* ↗ arrow top-right */}
                  <div className="absolute top-2 right-2 text-gray-300 dark:text-gray-600">
                    <ArrowUpRight size={10} />
                  </div>
                  {/* Emoji icon */}
                  <span className="text-xl leading-none flex-shrink-0">{qa.emoji}</span>
                  {/* Text */}
                  <div className="min-w-0 pr-1.5">
                    <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 leading-snug truncate">{qa.title}</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug truncate">{qa.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT STATE ── */}
      {hasChat && (
        <>
          <div className="flex-1 overflow-y-auto px-5 md:px-12 py-5 min-h-0" style={{ scrollbarWidth: 'thin' }}>
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-2 mb-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 self-end"
                    style={{ background: 'radial-gradient(circle at 35% 30%, #c4b5fd, #7c3aed 60%, #4338ca 100%)' }}>
                    <Bot size={13} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[78%] md:max-w-[60%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.role === 'user'
                    ? msg.content
                    : parseSegments(msg.content).map((seg, i) =>
                        seg.type === 'event-link' ? (
                          <button key={i}
                            onClick={() => { const ev = events.find(e => e.id === seg.eventId); if (ev) onEventSelect(ev); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors active:scale-95">
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
