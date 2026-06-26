import type { EventType } from '../types';

const SYNONYM_DICTIONARY: Record<string, string[]> = {
  // Food related
  'food': ['pagkain', 'feeding program', 'feeding', 'nutrition', 'nutrisyon', 'cooking', 'luto', 'kusina', 'pantry', 'meal', 'meals', 'food safety', 'palengke', 'trade fair', 'livelihood'],
  'pagkain': ['food', 'feeding program', 'nutrition', 'meal'],

  // Job / Career related
  'job': ['trabaho', 'hanapbuhay', 'employment', 'hiring', 'job fair', 'peso', 'career', 'first-time jobseeker', 'livelihood', 'business', 'work'],
  'trabaho': ['job', 'employment', 'hiring', 'career', 'peso', 'hanapbuhay'],
  'jobs': ['job', 'trabaho', 'hanapbuhay', 'employment', 'hiring', 'fair', 'career'],
  'work': ['job', 'trabaho', 'career', 'employment', 'hiring', 'livelihood', 'business'],

  // Health related
  'health': ['kalusugan', 'medical', 'gamot', 'checkup', 'vaccination', 'bakuna', 'clinic', 'cho', 'wellness', 'nutrition', 'dental', 'medicine', 'medical missions'],
  'kalusugan': ['health', 'medical', 'wellness', 'checkup'],
  'medical': ['health', 'wellness', 'vaccination', 'doctor', 'dental', 'medicine', 'medical missions', 'gamot', 'checkup'],
  'gamot': ['medicine', 'health', 'medical', 'free medicine', 'cho', 'yakap gamot', 'pharmacy'],
  'vaccine': ['vaccination', 'bakuna', 'health', 'medical', 'covid'],
  'bakuna': ['vaccine', 'vaccination', 'health', 'medical'],

  // Sports related
  'sports': ['palakasan', 'basketball', 'volleyball', 'football', 'soccer', 'zumba', 'fitness', 'tryout', 'tournament', 'athletic', 'clinic', 'liga'],
  'palakasan': ['sports', 'basketball', 'volleyball', 'fitness'],
  'basketball': ['sports', 'liga', 'tournament', 'tryout', 'clinic'],
  'volleyball': ['sports', 'liga', 'tournament', 'tryout', 'clinic'],
  'fitness': ['health', 'wellness', 'sports', 'zumba', 'exercise'],

  // Business related
  'business': ['negosyo', 'livelihood', 'kabuhayan', 'msme', 'bplo', 'permit', 'trade fair', 'entrepreneur', 'career', 'employment'],
  'negosyo': ['business', 'livelihood', 'kabuhayan', 'msme', 'entrepreneur'],
  
  // Education related
  'education': ['edukasyon', 'school', 'seminar', 'workshop', 'training', 'orientation', 'learning', 'student', 'scholarship', 'academic'],
  'edukasyon': ['education', 'school', 'learning', 'seminar'],
  'school': ['education', 'student', 'scholarship', 'seminar', 'youth', 'academic'],
  
  // Disaster / Emergency
  'disaster': ['sakuna', 'baha', 'bagyo', 'emergency', 'rescue', 'preparedness', 'bdrrmo', 'relief', 'evacuation'],
  'sakuna': ['disaster', 'emergency', 'rescue'],
  'bagyo': ['disaster', 'baha', 'rescue', 'relief'],
  'baha': ['disaster', 'bagyo', 'rescue', 'relief'],
  'emergency': ['disaster', 'rescue', 'sakuna', 'bdrrmo'],

  // Documents / Registry
  'documents': ['birth certificate', 'late registration', 'civil registry', 'kasal', 'binyag', 'marriage', 'certificate', 'registry', 'id'],
  'kasal': ['marriage', 'civil registry', 'wedding', 'documents'],
  'binyag': ['baptism', 'civil registry', 'documents'],

  // Community / Gov
  'government': ['civil registry', 'community service', 'social welfare', 'public service'],
  'help': ['social welfare', 'community service', 'assistance', 'relief', 'outreach', 'donation', 'tulong', 'ayuda'],
  'tulong': ['help', 'assistance', 'relief', 'ayuda'],
  'ayuda': ['help', 'relief', 'assistance', 'tulong'],
  'community': ['outreach', 'social welfare', 'service', 'volunteer', 'komunidad'],
};

// Helper to expand a query into a set of related terms
export function expandQuery(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const terms = new Set<string>();
  terms.add(normalized); // The exact query

  const checkAndAddSynonyms = (key: string) => {
    // Check direct matches
    if (SYNONYM_DICTIONARY[key]) {
      SYNONYM_DICTIONARY[key].forEach(syn => terms.add(syn));
    }
    // Check partial matches inside the dictionary (require at least 3 chars to prevent noise)
    if (key.length >= 3) {
      for (const dictKey in SYNONYM_DICTIONARY) {
        if (key.includes(dictKey) || dictKey.includes(key)) {
          terms.add(dictKey);
          SYNONYM_DICTIONARY[dictKey].forEach(syn => terms.add(syn));
        }
      }
    }
  };

  checkAndAddSynonyms(normalized);

  // Split into individual words if it's a phrase, and check them too
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  words.forEach(word => {
    terms.add(word);
    checkAndAddSynonyms(word);
  });

  return Array.from(terms);
}

// Helper to calculate a relevance score for an event against a query
export function calculateSearchScore(event: EventType, query: string): number {
  if (!query.trim()) return 1; // Default score if no query

  const normalizedQuery = query.toLowerCase().trim();
  const expandedTerms = expandQuery(normalizedQuery);
  
  let score = 0;

  // We assign higher weights to exact query matches compared to synonym matches
  const checkField = (fieldValue: string | undefined | null, weight: number) => {
    if (!fieldValue) return;
    const lowerField = fieldValue.toLowerCase();
    
    // 1. Check for exact original query match (huge boost)
    if (lowerField.includes(normalizedQuery)) {
      score += weight * 10;
    }

    // 2. Check for expanded synonym/term matches (normal boost)
    for (const term of expandedTerms) {
      if (term !== normalizedQuery && lowerField.includes(term)) {
        score += weight;
      }
    }
  };

  // Field weights
  checkField(event.name, 10);
  
  // Check categories (which can be array or string)
  const categories = Array.isArray(event.category) ? event.category : [event.category];
  categories.forEach(cat => checkField(cat, 8));

  checkField((event as any).subtitle, 6);
  checkField((event as any).tags?.join(' '), 5);
  checkField((event as any).eventType, 4);
  checkField(event.description, 3);
  checkField(event.venue, 2);
  checkField((event as any).leadOffice, 2);
  checkField(event.status, 2);
  
  const accessType = event.isPrivate ? 'private' : 'public';
  checkField(accessType, 2);

  return score;
}

// Main function to filter and sort events based on smart search logic
export function smartSearchEvents<T extends EventType>(events: T[], query: string): T[] {
  if (!query.trim()) return events;

  // Score every event
  const scoredEvents = events.map(event => ({
    event,
    score: calculateSearchScore(event, query),
  }));

  // Remove zero-score events and sort best-first
  const filtered = scoredEvents.filter(se => se.score > 0);
  filtered.sort((a, b) => b.score - a.score);

  // ── Deduplicate recurring series ──────────────────────────────────────────
  // All occurrences of the same recurring event share a recurrenceGroupId.
  // Keep only one occurrence per series: the nearest upcoming date, or the
  // most recent past date when every occurrence is already in the past.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groupBest = new Map<string, { event: T; score: number }>();
  const nonRecurring: Array<{ event: T; score: number }> = [];

  for (const se of filtered) {
    const gid = se.event.recurrenceGroupId;
    if (!gid) {
      nonRecurring.push(se);
      continue;
    }

    const existing = groupBest.get(gid);
    if (!existing) {
      groupBest.set(gid, se);
      continue;
    }

    const newDate = new Date((se.event.date || '') + 'T00:00:00');
    const exDate = new Date((existing.event.date || '') + 'T00:00:00');
    const newIsFuture = newDate >= today;
    const exIsFuture = exDate >= today;

    if (newIsFuture && !exIsFuture) {
      // Upcoming beats past
      groupBest.set(gid, se);
    } else if (newIsFuture && exIsFuture) {
      // Both upcoming → pick the nearer one
      if (newDate < exDate) groupBest.set(gid, se);
    } else if (!newIsFuture && !exIsFuture) {
      // Both past → pick the more recent one
      if (newDate > exDate) groupBest.set(gid, se);
    }
    // existing is upcoming and new is past → keep existing (no-op)
  }

  // Re-merge and sort so the final list is still relevance-ordered
  const deduped = [...nonRecurring, ...Array.from(groupBest.values())];
  deduped.sort((a, b) => b.score - a.score);

  return deduped.map(se => se.event);
}
