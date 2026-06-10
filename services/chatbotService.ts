
import { GoogleGenAI } from "@google/genai";
import type { EventType } from '../types';

// ── Hardcoded FAQ Fallback (checked BEFORE any AI API call) ───────────────────
interface FaqEntry {
  phrases: string[];   // any of these substrings trigger this entry (case-insensitive)
  answer: string;
}

const FAQ_LIST: FaqEntry[] = [
  {
    phrases: ['what is commove', 'ano ang commove', 'about commove', 'what does commove', 'commove app'],
    answer: `**Commove** is Bacoor City's official community events platform — your one-stop guide to everything happening in Bacoor, Cavite.\n\n📅 Browse upcoming events\n📍 Find events near you on the map\n🔔 Save events and get reminders\n🤖 Get AI-powered event recommendations based on your interests\n\nIt's free for everyone!`,
  },
  {
    phrases: ['how to register', 'how do i register', 'sign up for event', 'join an event', 'attend an event', 'how to join', 'paano mag-register', 'paano sumali'],
    answer: `To **register for an event**:\n\n1. Open the event you're interested in\n2. Tap **"Register"** or **"I'm Interested"**\n3. Fill in your details if required\n4. Wait for approval (for private/limited events)\n\nOnce approved, you'll receive a notification. Show your registration at the event entrance. 🎟️`,
  },
  {
    phrases: ['how to submit', 'submit event', 'event permit', 'create event', 'add event', 'paano mag-submit', 'paano gumawa ng event', 'post event'],
    answer: `To **submit an event permit**:\n\n1. Apply as a **Facilitator** first (Settings → Apply as Facilitator)\n2. Once approved, tap the **"+" button** to create an event\n3. Fill in event details, date, venue, and upload required documents\n4. Submit for admin review\n\nAdmin will review and publish your event. 📋`,
  },
  {
    phrases: ['how to become facilitator', 'apply as facilitator', 'facilitator request', 'how to be a facilitator', 'paano maging facilitator', 'organizer'],
    answer: `To **become a Facilitator**:\n\n1. Go to **Profile → Settings**\n2. Tap **"Apply as Facilitator"**\n3. Upload a valid government ID and a selfie for verification\n4. Submit your application\n\nAdmin will review your request. Once approved, you can create and manage events! ✅`,
  },
  {
    phrases: ['ai recommendation', 'how does the ai', 'how does recommendation', 'algorithm', 'personalized', 'suggested events', 'how are events recommended'],
    answer: `**Commove's AI Recommendations** use a **KNN (K-Nearest Neighbors)** algorithm that learns your preferences:\n\n- Events you **like, save, or attend** increase your interest profile\n- The AI matches your interests with upcoming events\n- Results are ranked by **relevance score**\n\nThe more you interact, the better the recommendations get! 🤖✨`,
  },
  {
    phrases: ['nearby events', 'events near me', 'events near', 'find events near', 'map', 'location', 'around me', 'malapit'],
    answer: `To find **nearby events**:\n\n1. Allow location access when prompted\n2. Tap the **Map tab** 🗺️ at the bottom\n3. Events near you will appear as pins\n4. Use the **"Today's Events"** filter to see what's happening now\n\nYou can also set your **home location** in Profile settings for better recommendations!`,
  },
  {
    phrases: ['save event', 'bookmark event', 'saved events', 'how to save', 'paano mag-save'],
    answer: `To **save an event**:\n\n1. Open any event\n2. Tap the **Bookmark icon** 🔖 in the top right\n3. Find all saved events under **Profile → Saved Events**\n\nSaved events also trigger automatic reminders before the event starts! 🔔`,
  },
  {
    phrases: ['what categories', 'event categories', 'types of events', 'what kinds of events', 'list of categories', 'what type of events'],
    answer: `Commove features events across many **categories**:\n\n🏃 Sports & Fitness\n🎭 Arts & Culture\n🏥 Health & Wellness\n💼 Business & Tech\n🎓 Education & Training\n🎉 Community & Social\n🌿 Environment\n🎊 Festivals & Entertainment\n\nFilter by category in the **Discover tab** to find events you love!`,
  },
  {
    phrases: ['contact', 'support', 'help desk', 'report problem', 'issue', 'email support', 'how to contact'],
    answer: `For **support or questions**, you can:\n\n📧 Email: **support@commove.com**\n\nOr use the **Help & Support** section in the app:\n1. Go to **Profile**\n2. Tap **"Help & Support"**\n3. Browse FAQs or submit a support request\n\nWe're here to help! 💬`,
  },
  {
    phrases: ['is it free', 'free to use', 'cost', 'bayad', 'libre', 'price', 'subscription', 'payment'],
    answer: `Yes, **Commove is completely free!** 🎉\n\nNo subscription, no hidden fees. Just download, sign up, and start discovering events in Bacoor, Cavite. Some events may have their own entrance fees, but the app itself is always free.`,
  },
  {
    phrases: ['bacoor', 'where is bacoor', 'bacoor city', 'cavite', 'saan ang bacoor'],
    answer: `**Bacoor City** is a component city in **Cavite Province**, Philippines, located just south of Metro Manila.\n\nCommove is the **official event platform of Bacoor City LGU**, helping residents stay connected with community events, government programs, and local activities. 📍`,
  },
  {
    phrases: ['reminder', 'notification', 'alert', 'remind me', 'set reminder', 'paano mag-set ng reminder'],
    answer: `To **set a reminder** for an event:\n\n1. Open the event details\n2. Tap **"Set Reminder"** 🔔\n3. Choose when to be reminded (30 min, 1 hour, 1 day before)\n\nYou can also save the event — Commove automatically reminds you 1 hour before saved events start!`,
  },
  {
    phrases: ['hello', 'hi', 'hey', 'kumusta', 'good morning', 'good afternoon', 'good evening', 'musta'],
    answer: `Hi there! 👋 I'm the **Commove Assistant** — your guide to events in Bacoor, Cavite!\n\nI can help you:\n- Find upcoming events 🗓️\n- Answer questions about registration\n- Explain how the app works\n\nWhat would you like to know?`,
  },
];

function checkFaq(userMessage: string): string | null {
  const lower = userMessage.toLowerCase().trim();
  for (const faq of FAQ_LIST) {
    for (const phrase of faq.phrases) {
      const p = phrase.toLowerCase();
      // Single-word phrases use word-boundary matching to prevent false substring hits
      // (e.g. "hi" inside "this", "hey" inside "they")
      const matched = p.includes(' ')
        ? lower.includes(p)
        : new RegExp(`\\b${p}\\b`).test(lower);
      if (matched) return faq.answer;
    }
  }
  return null;
}

// ── Local event queries (no AI, uses Firestore data) ──────────────────────────
type LocalQueryType = 'week' | 'sports' | 'weekend' | 'health' | 'tech' | 'nearby';

const LOCAL_QUERY_PATTERNS: { type: LocalQueryType; phrases: string[] }[] = [
  { type: 'week',    phrases: ['this week', "week's events", 'happening this week', 'events this week'] },
  { type: 'sports',  phrases: ['sports event', 'find sports', 'sports coming', 'sports activities', 'are there any sports'] },
  { type: 'weekend', phrases: ['this weekend', 'weekend events', "what's happening this weekend", 'weekend picks', 'saturday', 'sunday'] },
  { type: 'health',  phrases: ['health and wellness', 'health event', 'wellness event', 'fitness event', 'are there any health'] },
  { type: 'tech',    phrases: ['technology or business', 'tech event', 'business event', 'technology event', 'are there any technology'] },
  { type: 'nearby',  phrases: ['near bacoor', 'near you', 'events near', 'local event', 'happening near', 'nearby event'] },
];

function detectLocalQuery(msg: string): LocalQueryType | null {
  const lower = msg.toLowerCase();
  for (const { type, phrases } of LOCAL_QUERY_PATTERNS) {
    if (phrases.some(p => lower.includes(p))) return type;
  }
  return null;
}

function niceDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatEventLine(e: EventType): string {
  const time = e.startTime
    ? `⏰ ${formatTime12h(e.startTime)}${e.endTime ? ` – ${formatTime12h(e.endTime)}` : ''} | `
    : '';
  return `📌 **[${e.name}](event:${e.id})**\n🗓️ ${niceDate(e.date)} | ${time}📍 ${e.venue || 'TBA'}`;
}

function buildLocalEventAnswer(type: LocalQueryType, events: EventType[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const published = events.filter(e => {
    if (e.status !== 'published' && e.status !== 'scheduled') return false;
    // Use endDate when available — a multi-day event is still "active" until its last day
    const effectiveEnd = e.endDate && e.endDate > e.date ? e.endDate : e.date;
    return effectiveEnd >= todayStr;
  });

  let filtered: EventType[] = [];
  let heading = '';
  let emptyMsg = '';

  if (type === 'week') {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    filtered = published.filter(e => e.date <= weekEndStr);
    heading = "**This Week's Events** in Bacoor, Cavite 📅";
    emptyMsg = "No events scheduled for this week yet. Check back soon!";

  } else if (type === 'sports') {
    filtered = published.filter(e =>
      (Array.isArray(e.category) ? e.category : [e.category ?? '']).some(c =>
        c.toLowerCase().includes('sport') || c.toLowerCase().includes('fitness') || c.toLowerCase().includes('recreation')
      )
    );
    heading = '**Sports & Fitness Events** 🏆';
    emptyMsg = "No sports events found at the moment. Check back soon!";

  } else if (type === 'weekend') {
    const dayOfWeek = today.getDay();
    const daysToSat = (6 - dayOfWeek + 7) % 7 || 7;
    const sat = new Date(today); sat.setDate(today.getDate() + daysToSat);
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const satStr = sat.toISOString().slice(0, 10);
    const sunStr = sun.toISOString().slice(0, 10);
    filtered = published.filter(e => e.date === satStr || e.date === sunStr);
    heading = '**Weekend Events** (Sat & Sun) 🌅';
    emptyMsg = "No events this weekend yet. Check back later!";

  } else if (type === 'health') {
    filtered = published.filter(e =>
      (Array.isArray(e.category) ? e.category : [e.category ?? '']).some(c =>
        c.toLowerCase().includes('health') || c.toLowerCase().includes('wellness') || c.toLowerCase().includes('medical')
      )
    );
    heading = '**Health & Wellness Events** 🏥';
    emptyMsg = "No health and wellness events found right now.";

  } else if (type === 'tech') {
    filtered = published.filter(e =>
      (Array.isArray(e.category) ? e.category : [e.category ?? '']).some(c =>
        c.toLowerCase().includes('tech') || c.toLowerCase().includes('business') ||
        c.toLowerCase().includes('employment') || c.toLowerCase().includes('seminar')
      )
    );
    heading = '**Tech & Business Events** 💻';
    emptyMsg = "No tech or business events found at the moment.";

  } else {
    filtered = published.slice(0, 6);
    heading = '**Events Near You** in Bacoor, Cavite 📍';
    emptyMsg = "No upcoming events found nearby right now.";
  }

  filtered = filtered.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  if (!filtered.length) return `${heading}\n\n${emptyMsg}`;

  const lines = filtered.map(formatEventLine).join('\n\n');
  const suffix = filtered.length === 6 ? '\n\n_Showing top 6 events. Browse the app for more!_' : '';
  return `${heading}\n\n${lines}${suffix}`;
}

function checkLocalEventQuery(userMessage: string, events: EventType[]): string | null {
  const type = detectLocalQuery(userMessage);
  if (!type) return null;
  return buildLocalEventAnswer(type, events);
}

// ── Ollama config (local LLM — primary provider) ──────────────────────────────
export const ollamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',
};
// ── Gemini config (cloud fallback) ────────────────────────────────────────────
// ── Gemini config (cloud fallback) ────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const STORAGE_KEY = 'commove_ai_key';

// ADD THIS TEMPORARY LINE HERE:
console.log("DEBUG - AI Key loaded:", API_KEY ? "FOUND (Starts with " + API_KEY.slice(0, 5) + ")" : "NOT FOUND / UNDEFINED");

if (typeof window !== 'undefined') {
  localStorage.setItem(STORAGE_KEY, API_KEY);
}

let ai: any = null;
try {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
} catch (e) {
  console.warn("Failed to initialize GoogleGenAI:", e);
}

export const isChatbotAvailable = () => true;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const formatTime12h = (time: string): string => {
  if (!time) return 'TBA';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

const buildEventsContext = (events: EventType[]): string => {
  const today = new Date().toISOString().split('T')[0];
  const published = events
    .filter(e => (e.status === 'published' || e.status === 'scheduled') && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 50);

  if (!published.length) return 'No upcoming events currently scheduled.';

  return published.map(e => {
    const cats = Array.isArray(e.category) ? e.category.join(', ') : (e.category ?? 'General');
    const timeStr = e.startTime
      ? `${formatTime12h(e.startTime)}${e.endTime ? ` – ${formatTime12h(e.endTime)}` : ''}`
      : 'Time TBA';
    const lines = [
      `Event ID: ${e.id}`,
      `Event: ${e.name}`,
      `Date: ${e.date}${e.endDate ? ` to ${e.endDate}` : ''}`,
      `Time: ${timeStr}`,
      `Venue: ${e.venue || 'TBA'}`,
      `City: ${e.city || 'Bacoor, Cavite'}`,
      `Category: ${cats}`,
    ];
    if (e.description) lines.push(`Details: ${e.description.slice(0, 200)}`);
    if (e.organizer) lines.push(`Organizer: ${e.organizer}`);
    if (e.isPrivate) lines.push(`Note: Registration/approval required to attend`);
    if (e.instructions) lines.push(`Instructions: ${e.instructions.slice(0, 100)}`);
    return lines.join('\n');
  }).join('\n\n---\n\n');
};

// Retry with exponential backoff for 429 rate-limit errors
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = (err?.message ?? err?.toString() ?? '').toLowerCase();
    const status = err?.status ?? err?.httpStatus ?? err?.code ?? 0;

    // Log the raw error so we can diagnose key issues in the browser console
    if (retries === 3) {
      console.error('[Commove AI] raw error:', {
        status,
        message: err?.message,
        code: err?.code,
        name: err?.name,
      });
    }

    // Detect an invalid / revoked key — only on explicit auth errors, not generic 400s
    const isInvalidKey =
      status === 401 ||
      msg.includes('api key not valid') ||
      msg.includes('invalid api key') ||
      msg.includes('api_key_invalid') ||
      msg.includes('unauthenticated');

    if (isInvalidKey) throw new Error('INVALID_KEY');

    const is429 =
      status === 429 ||
      msg.includes('429') ||
      msg.includes('too many requests') ||
      msg.includes('resource_exhausted') ||
      msg.includes('resource has been exhausted') ||
      msg.includes('quota');

    if (retries === 0) {
      if (is429) throw new Error('RATE_LIMIT');
      throw err;
    }

    if (is429) {
      await new Promise(r => setTimeout(r, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 2);
    }

    throw err;
  }
}

// ── Ollama sender ─────────────────────────────────────────────────────────────
async function sendWithOllama(
  systemInstruction: string,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${ollamaConfig.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaConfig.model, messages, stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    const text = data.message?.content?.trim();
    if (!text) throw new Error('Ollama returned empty response');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

const simulateTyping = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export const sendChatMessage = async (
  userMessage: string,
  events: EventType[],
  history: ChatMessage[]
): Promise<string> => {
  const faqAnswer = checkFaq(userMessage);
  if (faqAnswer) {
    await simulateTyping(600 + (userMessage.length % 7) * 80);
    return faqAnswer;
  }

  const localAnswer = checkLocalEventQuery(userMessage, events);
  if (localAnswer) {
    await simulateTyping(800 + (userMessage.length % 5) * 90);
    return localAnswer;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const systemInstruction = `You are Commove Assistant — a friendly and helpful community event guide for Bacoor, Cavite, Philippines.
Today is ${today}.

You have real-time access to the published events database. Here are all upcoming events:

${buildEventsContext(events)}

GUIDELINES:
- Answer questions about events using only data from the database above.
- For each event mentioned, always include a clickable link using this exact format: [Event Name](event:EVENT_ID)
  Example: [Bacoor Marching Arts Workshop 2026](event:abc123xyz)
- Include the link right after the event name, so users can tap to open the event details.
- Also include date (formatted nicely, e.g. "Friday, June 12"), time (12-hour format), and venue.
- If the user asks about a specific event by name, give full details with the link.
- If a user asks for events by category, day, or keyword — list the matching ones, each with a link.
- If an event requires registration, always mention it.
- If you cannot find the event or information, say so honestly and suggest the user browse the app.
- Be conversational, concise, and friendly — like a local community guide.
- You may respond in Filipino/Tagalog if the user writes in it.
- Do not make up events or details not in the database.
- Never invent Event IDs — only use the exact IDs from the database above.`;

  // Try Ollama first (local, free, private)
  try {
    return await sendWithOllama(systemInstruction, history, userMessage);
  } catch (ollamaErr) {
    console.warn('[Commove AI] Ollama unavailable, falling back to Gemini:', ollamaErr);
  }

  // Gemini fallback
  if (!ai) throw new Error('AI not configured. Please set an API key.');

  const contents = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ];

  const response = await retryWithBackoff(() =>
    ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { systemInstruction },
    })
  );

  return (response as any).text?.trim() || "Sorry, I couldn't generate a response. Please try again.";
};
