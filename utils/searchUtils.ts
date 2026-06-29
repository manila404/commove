import type { EventType } from '../types';

// ── Stop words (English + Filipino) ──────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','be','this','that','it','i','we','you','they','what','how','when',
  'where','who','will','can','do','does','did','have','has','had','get','got','go',
  'ng','sa','ang','na','mga','ay','si','ni','para','po','mo','ko','siya','nila','namin',
  'kami','kayo','niya','din','rin','lang','may','walang','wala','may','hindi','oo',
]);

// ── Concept groups: broad ideas → app event categories ───────────────────────
// These are INTENTIONALLY wide so any related query word triggers the category.
// Add new concept groups here — no keyword-to-keyword mapping needed.
const CONCEPT_GROUPS: Array<{ words: string[]; categories: string[] }> = [
  {
    words: [
      'sport','game','play','athletic','exercise','tournament','league','match','race',
      'team','gym','fitness','training','coach','ball','court','field','swim','run',
      'jump','compete','champion','score','cheer','outdoor','indoor','physical',
      'chess','badminton','tennis','boxing','martial','arnis','taekwondo','karate',
      'palakasan','tryout','liga','varsity','athlete','player','skating','cycling',
      'hiking','climbing','archery','shooting','golf','billiards','darts','bowling',
      'wrestling','judo','fencing','rowing','softball','baseball','futsal',
    ],
    categories: ['Sports', 'Health and Wellness'],
  },
  {
    words: [
      'health','medical','doctor','nurse','clinic','medicine','vaccine','checkup',
      'wellness','nutrition','diet','dental','disease','treatment','care','heal',
      'sick','blood','aid','kalusugan','gamot','bakuna','vaccination','hospital',
      'pharmacy','checkup','relief','sanitation','hygiene','maternal','birth',
      'mental','stress','anxiety','depression','therapy','counseling','rehab',
      'paramedic','ambulance','emergency','first aid','cpr','zumba','aerobics',
    ],
    categories: ['Health and Wellness'],
  },
  {
    words: [
      'job','work','career','hire','employ','business','trade','sell','market',
      'economy','negosyo','livelihood','company','enterprise','commerce','recruit',
      'peso','income','earn','salary','hanapbuhay','trabaho','entrepreneur','startup',
      'msme','permit','bplo','kabuhayan','loan','capital','profit','investment',
      'cooperative','franchise','vending','online selling','e-commerce','digital',
      'freelance','coding','programming','tech','information technology',
    ],
    categories: ['Business'],
  },
  {
    words: [
      'learn','teach','train','skill','seminar','lecture','class','course','study',
      'education','develop','improve','workshop','tutorial','knowledge','edukasyon',
      'scholarship','academic','student','session','hands-on','demo','orientation',
      'leadership','management','communication','writing','reading','math','science',
      'arts','craft','cooking','baking','sewing','carpentry','welding','electrical',
      'plumbing','design','photography','videography','journalism','research',
    ],
    categories: ['Workshop'],
  },
  {
    words: [
      'music','concert','sing','dance','perform','show','art','culture','band',
      'festival','entertainment','live','theatre','drama','choir','musical','recital',
      'orchestra','song','artist','exhibit','gallery','film','movie','poetry',
      'spoken word','comedy','stand-up','talent','pageant','parade','marching',
      'cultural','indigenous','folk','traditional','modern','contemporary','hip-hop',
      'jazz','pop','rock','gospel','opera','acoustic','open mic',
    ],
    categories: ['Concerts'],
  },
  {
    words: [
      'community','social','help','volunteer','outreach','charity','welfare','public',
      'together','tulong','service','donation','civic','relief','barangay','resident',
      'citizen','people','komunidad','ayuda','assistance','environment','clean-up',
      'tree planting','feeding','distribution','livelihood','senior','pwd','youth',
      'women','children','orphan','elderly','disaster','calamity','rescue','bswd',
      'dswd','social worker','advocacy','awareness','rights','protest','rally',
    ],
    categories: ['Community'],
  },
  {
    words: [
      'document','certificate','registration','record','birth','death','marriage',
      'baptism','id','passport','license','permit','registry','civil','kasal',
      'binyag','late registration','nso','psa','clearance','police','nbi','barangay',
    ],
    categories: ['Community', 'Business'],
  },
  {
    words: [
      'disaster','sakuna','baha','bagyo','flood','typhoon','earthquake','fire',
      'emergency','rescue','preparedness','bdrrmo','evacuation','storm','landslide',
    ],
    categories: ['Community', 'Health and Wellness'],
  },
];

// ── N-gram helpers ────────────────────────────────────────────────────────────

function getWordNgrams(word: string, n = 3): Set<string> {
  const ngrams = new Set<string>();
  if (word.length <= n) { ngrams.add(word); return ngrams; }
  for (let i = 0; i <= word.length - n; i++) ngrams.add(word.slice(i, i + n));
  return ngrams;
}

// Fuzzy similarity between two words using character trigram Jaccard index
function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.85;
  if (a.length < 3 || b.length < 3) return a === b ? 1 : 0;
  const aNg = getWordNgrams(a);
  const bNg = getWordNgrams(b);
  let intersection = 0;
  aNg.forEach(ng => { if (bNg.has(ng)) intersection++; });
  const union = aNg.size + bNg.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Extract meaningful keywords from a query string
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

// ── Public API ────────────────────────────────────────────────────────────────

// Infer which event categories a query most likely belongs to.
// Works for ANY word — no manual mapping needed.
export function inferCategories(query: string): string[] {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  const scores: Record<string, number> = {};

  for (const kw of keywords) {
    for (const group of CONCEPT_GROUPS) {
      let best = 0;
      for (const concept of group.words) {
        const sim = wordSimilarity(kw, concept);
        if (sim > best) best = sim;
        if (best >= 0.9) break; // close enough, stop early
      }
      if (best >= 0.5) {
        for (const cat of group.categories) {
          scores[cat] = (scores[cat] || 0) + best;
        }
      }
    }
  }

  return Object.entries(scores)
    .filter(([, s]) => s >= 0.5)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);
}

// Dynamically expand a query into related terms using concept group matching.
// Replaces the old static SYNONYM_DICTIONARY — works for any keyword.
export function expandQuery(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const keywords = extractKeywords(normalized);
  const terms = new Set<string>();
  terms.add(normalized);
  keywords.forEach(kw => terms.add(kw));

  for (const kw of keywords) {
    for (const group of CONCEPT_GROUPS) {
      let matched = false;
      for (const concept of group.words) {
        if (wordSimilarity(kw, concept) >= 0.6) { matched = true; break; }
      }
      // When a keyword matches a concept group, add all words in that group
      // so the scoring picks up related events in the same domain
      if (matched) group.words.forEach(w => terms.add(w));
    }
  }

  return Array.from(terms);
}

// Score an event's relevance to a query using multiple signals:
//   1. Exact phrase match         (highest weight)
//   2. Expanded concept terms     (medium weight)
//   3. Fuzzy word similarity      (catches typos / close spellings)
//   4. Inferred category match    (category-level relevance)
export function calculateSearchScore(event: EventType, query: string): number {
  if (!query.trim()) return 1;

  const normalizedQuery = query.toLowerCase().trim();
  const queryKeywords   = extractKeywords(normalizedQuery);
  const expandedTerms   = new Set(expandQuery(normalizedQuery));
  const inferredCats    = inferCategories(normalizedQuery);

  let score = 0;

  const checkField = (fieldValue: string | undefined | null, weight: number) => {
    if (!fieldValue) return;
    const lowerField = fieldValue.toLowerCase();
    const fieldWords  = extractKeywords(lowerField);

    // Exact phrase
    if (lowerField.includes(normalizedQuery)) score += weight * 10;

    // Expanded terms
    for (const term of expandedTerms) {
      if (term !== normalizedQuery && lowerField.includes(term)) score += weight;
    }

    // Fuzzy word similarity — catches typos and close spellings
    for (const qw of queryKeywords) {
      for (const fw of fieldWords) {
        const sim = wordSimilarity(qw, fw);
        if (sim >= 0.75 && sim < 1.0) score += weight * sim * 0.5;
      }
    }
  };

  checkField(event.name, 10);

  const categories = Array.isArray(event.category) ? event.category : [event.category];
  categories.forEach(cat => {
    checkField(cat, 8);
    // Inferred category match — key for "chess → Sports" recommendations
    if (inferredCats.includes(cat)) score += 8;
  });

  checkField((event as any).subtitle, 6);
  checkField((event as any).tags?.join(' '), 5);
  checkField((event as any).eventType, 4);
  checkField(event.description, 3);
  checkField(event.venue, 2);
  checkField((event as any).leadOffice, 2);

  return score;
}

// Main search function — filter and rank events for a query
export function smartSearchEvents<T extends EventType>(events: T[], query: string): T[] {
  if (!query.trim()) return events;

  const scoredEvents = events.map(event => ({
    event,
    score: calculateSearchScore(event, query),
  }));

  const filtered = scoredEvents.filter(se => se.score > 0);
  filtered.sort((a, b) => b.score - a.score);

  // Deduplicate recurring event series — keep nearest upcoming occurrence
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groupBest = new Map<string, { event: T; score: number }>();
  const nonRecurring: Array<{ event: T; score: number }> = [];

  for (const se of filtered) {
    const gid = se.event.recurrenceGroupId;
    if (!gid) { nonRecurring.push(se); continue; }

    const existing = groupBest.get(gid);
    if (!existing) { groupBest.set(gid, se); continue; }

    const newDate = new Date((se.event.date || '') + 'T00:00:00');
    const exDate  = new Date((existing.event.date || '') + 'T00:00:00');
    const newIsFuture = newDate >= today;
    const exIsFuture  = exDate  >= today;

    if (newIsFuture && !exIsFuture) {
      groupBest.set(gid, se);
    } else if (newIsFuture && exIsFuture) {
      if (newDate < exDate) groupBest.set(gid, se);
    } else if (!newIsFuture && !exIsFuture) {
      if (newDate > exDate) groupBest.set(gid, se);
    }
  }

  const deduped = [...nonRecurring, ...Array.from(groupBest.values())];
  deduped.sort((a, b) => b.score - a.score);
  return deduped.map(se => se.event);
}
