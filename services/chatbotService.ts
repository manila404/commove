
import { GoogleGenAI } from "@google/genai";
import type { EventType } from '../types';

const ENV_API_KEY = (typeof process !== 'undefined' && process && process.env) ? process.env.API_KEY : undefined;
const STORAGE_KEY = 'commove_ai_key';

let ai: GoogleGenAI | null = null;

const initAI = () => {
  let key = ENV_API_KEY;
  if (!key && typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) key = stored;
  }
  ai = key ? new GoogleGenAI({ apiKey: key }) : null;
};

initAI();

export const isChatbotAvailable = () => !!ai;

export const setApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key);
  }
  initAI();
};

export const clearApiKey = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  ai = null;
};

export const getSavedApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
};

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
    const is429 =
      err?.status === 429 ||
      err?.message?.includes('429') ||
      err?.message?.toLowerCase().includes('too many requests') ||
      err?.message?.toLowerCase().includes('quota');

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

export const sendChatMessage = async (
  userMessage: string,
  events: EventType[],
  history: ChatMessage[]
): Promise<string> => {
  if (!ai) throw new Error('AI not configured. Please set an API key.');

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

  const contents = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ];

  const response = await retryWithBackoff(() =>
    ai!.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: { systemInstruction },
    })
  );

  return response.text?.trim() || "Sorry, I couldn't generate a response. Please try again.";
};
