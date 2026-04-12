
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { EventType } from '../types';

// 1. Try to get key from Environment (Standard Web)
// Safely check if process is defined to avoid ReferenceError in some browser environments
const ENV_API_KEY = (typeof process !== 'undefined' && process && process.env) ? process.env.API_KEY : undefined;

// 2. Helper to initialize the AI instance
let ai: GoogleGenAI | null = null;

const initializeAI = () => {
    let keyToUse = ENV_API_KEY;

    // If no env key, check LocalStorage (Mobile/APK fallback)
    if (!keyToUse && typeof window !== 'undefined') {
        const storedKey = localStorage.getItem('commove_ai_key');
        if (storedKey) keyToUse = storedKey;
    }

    if (keyToUse) {
        ai = new GoogleGenAI({ apiKey: keyToUse });
    } else {
        console.warn("Gemini API Key missing. AI features disabled.");
        ai = null;
    }
};

// Initialize on load
initializeAI();

export const isAIConfigured = (): boolean => {
    return !!ai;
};

export const setManualApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('commove_ai_key', key);
        initializeAI();
    }
};

// Retry logic to handle mobile network instability
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Stop retrying if we run out of attempts
    if (retries === 0) throw error;
    
    // Log and wait before retrying
    console.warn(`Gemini API request failed, retrying... (${retries} attempts left). Error: ${error.message}`);
    await new Promise(r => setTimeout(r, delay));
    
    // Double the delay for the next attempt (exponential backoff)
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Helper to robustly parse JSON from Gemini response
const parseGeminiResponse = (text: string | undefined): any => {
    if (!text) return null;
    try {
        // 1. Try direct parse
        return JSON.parse(text);
    } catch (e) {
        // 2. Try removing markdown code blocks
        const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch (e2) {
            // 3. Try finding the first '{' and last '}'
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                try {
                    return JSON.parse(text.substring(start, end + 1));
                } catch (e3) {
                    console.error("Failed to parse JSON substring:", text.substring(start, end + 1));
                    return null;
                }
            }
            return null;
        }
    }
};

export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number }> => {
  if (!ai) {
    throw new Error("API Key not configured.");
  }

  try {
    const prompt = `You are a geocoding service. Given the following address in Bacoor, Cavite, Philippines, provide the most likely latitude and longitude. Address: "${address}". Return ONLY a JSON object with "lat" and "lng" keys.`;
    
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
          required: ["lat", "lng"],
        },
      },
    }));

    const result = parseGeminiResponse(response.text);
    
    if (result && typeof result.lat === 'number' && typeof result.lng === 'number') {
      return result;
    } else {
      throw new Error("Invalid coordinates received from API.");
    }

  } catch (error) {
    console.error("Error geocoding address with Gemini API:", error);
    // Fallback to a default location if geocoding fails
    return { lat: 14.4447, lng: 120.9525 };
  }
};

export const extractEventFromImage = async (base64Image: string, optionalText: string = ""): Promise<{ isEvent: boolean; name?: string; date?: string; startTime?: string; venue?: string; description?: string; category?: string } | null> => {
  if (!ai) return null;

  try {
    const currentYear = new Date().getFullYear();
    
    // Extract actual MIME type and data
    const mimeTypeMatch = base64Image.match(/^data:(.*);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg'; // Default to jpeg if missing
    const base64Data = base64Image.replace(/^data:(.*);base64,/, '');

    const prompt = `Analyze this image (likely an event flyer or poster). 
    ${optionalText ? `Additional context provided: "${optionalText}"` : ''}
    
    Extract the event details.
    Context: Today is ${new Date().toISOString().split('T')[0]}. Assume ${currentYear} if year is missing. Location defaults to Bacoor, Cavite if not specified.

    Return JSON:
    - isEvent: boolean (true if it looks like an event)
    - name: Event title
    - date: YYYY-MM-DD
    - startTime: HH:MM (24hr, default 08:00)
    - venue: Location name
    - description: Summary of the event
    - category: One of [Concerts, Conference, Arts, Gaming, Business, Cosplay, Competitions, Technology, Health, Expo Events, Cafe]`;

    const response = await retryWithBackoff<GenerateContentResponse>(() => ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isEvent: { type: Type.BOOLEAN },
            name: { type: Type.STRING },
            date: { type: Type.STRING },
            startTime: { type: Type.STRING },
            venue: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["isEvent"],
        },
      }
    }));

    const result = parseGeminiResponse(response.text);

    if (result && result.isEvent && result.name) {
      return result;
    }
    return null;

  } catch (error) {
    console.error("Error extracting event from image:", error);
    return null;
  }
};

export const extractEventFromText = async (input: string): Promise<{ isEvent: boolean; name?: string; date?: string; startTime?: string; venue?: string; description?: string; category?: string } | null> => {
  if (!ai || !input) return null;

  try {
    const currentYear = new Date().getFullYear();
    const trimmedInput = input.trim();
    const isUrl = trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://');

    let prompt;
    let config;

    if (isUrl) {
      // URL Mode: Use Search Grounding
      prompt = `You are an event extraction AI. 
      
      I will provide a URL: "${trimmedInput}".
      
      Use Google Search to find details about the event described in this link. 
      
      Context: Today is ${new Date().toISOString().split('T')[0]}. If a year is not specified, assume ${currentYear}. The location defaults to Bacoor, Cavite.

      Extract the following details and return them as a valid JSON object. Do NOT return Markdown formatting. Just the raw JSON string.
      
      JSON Structure:
      {
        "isEvent": boolean (true if it is a specific event with a date/time, false if just news/status),
        "name": "Short event title",
        "date": "YYYY-MM-DD",
        "startTime": "HH:MM" (24hr format, default 08:00),
        "venue": "Location name",
        "description": "1 sentence summary",
        "category": "One of [Concerts, Conference, Arts, Gaming, Business, Cosplay, Competitions, Technology, Health, Expo Events, Cafe]"
      }`;

      config = {
        tools: [{ googleSearch: {} }]
      };

    } else {
      // Text Mode: Use standard extraction with Schema
      prompt = `Analyze the following social media post text.
      
      Post Text:
      """
      ${trimmedInput.substring(0, 5000)}
      """
      
      Context: Today is ${new Date().toISOString().split('T')[0]}. Assume the event is in ${currentYear} if the year is not explicitly mentioned. The location defaults to Bacoor, Cavite if not explicit.
      
      Return JSON:
      - isEvent: boolean
      - name: Short, catchy event title
      - date: YYYY-MM-DD format.
      - startTime: HH:MM format (24hr). Default to "08:00".
      - venue: The location name. Default to "Bacoor, Cavite".
      - description: A 1-sentence summary.
      - category: One of [Concerts, Conference, Arts, Gaming, Business, Cosplay, Competitions, Technology, Health, Expo Events, Cafe]`;

      config = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isEvent: { type: Type.BOOLEAN },
            name: { type: Type.STRING },
            date: { type: Type.STRING },
            startTime: { type: Type.STRING },
            venue: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["isEvent"],
        },
      };
    }

    const response = await retryWithBackoff<GenerateContentResponse>(() => ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: config,
    }));

    const result = parseGeminiResponse(response.text);
    
    if (result && result.isEvent && result.name) {
      return result;
    }
    return null;

  } catch (error) {
    console.error("Error parsing event from input:", error);
    return null;
  }
};
