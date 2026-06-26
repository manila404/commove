import type { EventType } from '../types';

const SYNONYM_DICTIONARY: Record<string, string[]> = {
  // Sports related
  'basketball': ['sports', 'athletic', 'fitness', 'tryout', 'clinic', 'youth sports', 'training', 'tournament', 'liga', 'basketball training', 'sports clinics'],
  'soccer': ['sports', 'athletic', 'football', 'tryout', 'clinic', 'training', 'tournament', 'football training', 'sports programs'],
  'volleyball': ['sports', 'athletic', 'tryout', 'clinic', 'training', 'tournament', 'liga'],
  'sports': ['basketball', 'soccer', 'volleyball', 'athletic', 'fitness', 'tryout', 'clinic', 'tournament', 'sports programs'],
  'athletic': ['sports', 'fitness', 'training', 'tryout', 'tournament'],
  'fitness': ['health', 'wellness', 'sports', 'athletic'],

  // Job / Career related
  'job': ['career', 'employment', 'livelihood', 'hiring', 'fair', 'business', 'work', 'job fairs', 'career opportunities'],
  'jobs': ['career', 'employment', 'livelihood', 'hiring', 'fair', 'business', 'work', 'job fairs', 'career opportunities'],
  'looking for job': ['job fair', 'career', 'employment', 'livelihood', 'hiring', 'business', 'employment assistance', 'hiring events'],
  'work': ['job', 'career', 'employment', 'hiring', 'livelihood', 'business'],
  'business': ['livelihood', 'career', 'employment', 'entrepreneur'],
  'career': ['job', 'employment', 'hiring', 'fair'],

  // Health related
  'health': ['medical', 'wellness', 'vaccination', 'clinic', 'seminar', 'doctor', 'dental', 'medicine', 'medical missions', 'health seminars', 'vaccination drives', 'nutrition'],
  'medical': ['health', 'wellness', 'vaccination', 'doctor', 'dental', 'medicine', 'medical missions'],
  'wellness': ['health', 'medical', 'fitness', 'mental health', 'wellness programs'],
  'vaccine': ['vaccination', 'health', 'medical', 'covid'],
  'nutrition': ['health', 'food', 'wellness', 'feeding program'],

  // Food related
  'food': ['feeding program', 'food festival', 'nutrition', 'livelihood cooking', 'cooking', 'community pantry', 'food safety', 'meal'],

  
  // Education related
  'school': ['education', 'student', 'scholarship', 'seminar', 'youth', 'academic', 'college', 'university', 'learning', 'education programs', 'student activities'],
  'education': ['school', 'student', 'scholarship', 'seminar', 'learning', 'academic', 'education programs'],
  'student': ['school', 'education', 'scholarship', 'youth', 'learning', 'student activities'],
  'scholarship': ['school', 'education', 'student', 'financial aid'],
  'youth': ['student', 'school', 'seminar', 'youth seminars', 'activities'],
  
  // Concerts / Arts
  'music': ['concert', 'festival', 'band', 'singing', 'performance', 'arts'],
  'concert': ['music', 'festival', 'band', 'performance'],
  'art': ['exhibit', 'museum', 'creative', 'culture'],

  // Community / Gov
  'government': ['civil registry', 'community service', 'social welfare', 'public service'],
  'help': ['social welfare', 'community service', 'assistance', 'relief', 'outreach', 'donation'],
  'community': ['outreach', 'social welfare', 'service', 'volunteer'],
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
    // Check partial matches inside the dictionary
    for (const dictKey in SYNONYM_DICTIONARY) {
      if (key.includes(dictKey) || dictKey.includes(key)) {
        terms.add(dictKey);
        SYNONYM_DICTIONARY[dictKey].forEach(syn => terms.add(syn));
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
