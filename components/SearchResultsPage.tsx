import React, { useMemo, useState } from 'react';
import {
  Search, X, ArrowLeft, Calendar, Clock, MapPin, Users,
  Sparkles, Lock,
} from 'lucide-react';
import type { EventType, DisplayEventType, User } from '../types';
import { formatDisplayDate, formatTime, EventImage } from '../constants';
import { smartSearchEvents, expandQuery, calculateSearchScore, inferCategories } from '../utils/searchUtils';
import { getCategoryStyle } from '../utils/categoryStyles';
import Spinner from './Spinner';

// ─── helpers ────────────────────────────────────────────────────────────────

const isFutureEvent = (event: EventType): boolean => {
  const refDate = event.endDate || event.date;
  const refTime = event.endTime || '23:59';
  const endMs = new Date(`${refDate}T${refTime}`).getTime();
  return isNaN(endMs) || endMs > Date.now();
};

const statusLabel: Record<string, { label: string; cls: string }> = {
  published: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

// ─── SearchResultCard ────────────────────────────────────────────────────────

interface SearchResultCardProps {
  event: EventType;
  onSelect: (event: EventType) => void;
  highlight?: boolean;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ event, onSelect }) => {
  const cats = Array.isArray(event.category) ? event.category : [event.category];
  const firstCatStyle = getCategoryStyle(cats[0]);

  return (
    <div
      onClick={() => onSelect(event)}
      className="group bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col h-full"
    >
      {/* Top accent */}
      <div className={`h-1 w-full bg-gradient-to-r ${firstCatStyle.bg}`} />

      {/* Image */}
      <div className="overflow-hidden h-40 sm:h-48 flex-shrink-0 relative">
        <EventImage
          src={event.imageUrl}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
        {event.isPrivate && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            PRIVATE
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Category badges */}
        <div className="mb-2 flex flex-wrap gap-1">
          {cats.slice(0, 2).map(cat => (
            <span
              key={cat}
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getCategoryStyle(cat).badge}`}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-tight line-clamp-2">
          {event.name}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2 flex-grow">
            {event.description}
          </p>
        )}

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span>{formatDisplayDate(event.date, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span>{formatTime(event.startTime)}{event.endTime ? ` – ${formatTime(event.endTime)}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span className="truncate">{event.venue}{event.city ? `, ${event.city}` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── RecommendationCard ──────────────────────────────────────────────────────

const RecommendationCard: React.FC<{ event: EventType; onSelect: (event: EventType) => void }> = ({ event, onSelect }) => {
  const cats = Array.isArray(event.category) ? event.category : [event.category];
  const style = getCategoryStyle(cats[0]);

  return (
    <div
      onClick={() => onSelect(event)}
      className="group flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60
        overflow-hidden cursor-pointer hover:shadow-lg dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className={`h-1 w-full bg-gradient-to-r ${style.bg}`} />
      <div className="relative h-32 overflow-hidden">
        <EventImage src={event.imageUrl} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {cats.slice(0, 1).map(cat => (
          <span key={cat} className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-bold">
            {cat}
          </span>
        ))}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 leading-snug mb-2">
          {event.name}
        </h4>
        <div className="mt-auto space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary-400 flex-shrink-0" />
            <span className="truncate">{formatDisplayDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary-400 flex-shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export interface SearchResultsPageProps {
  initialQuery: string;
  events: EventType[];
  currentUser: User | null;
  onBack: () => void;
  onEventSelect: (event: EventType) => void;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  initialQuery,
  events,
  currentUser,
  onBack,
  onEventSelect,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [liveQuery, setLiveQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce: update `query` only after user stops typing
  const handleInputChange = (val: string) => {
    setLiveQuery(val);
    setIsSearching(true);
    const t = setTimeout(() => {
      setQuery(val);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(t);
  };

  // Pool: only published/live future events
  const pool = useMemo(
    () =>
      events.filter(e => {
        const isVisible = e.status === 'published' || (e.status === 'scheduled' && e.publishAt && e.publishAt <= Date.now());
        return isVisible && isFutureEvent(e);
      }),
    [events]
  );

  // Main search results, split by exact and related matches
  const { exactMatches, relatedMatches } = useMemo(() => {
    if (!query.trim()) return { exactMatches: [], relatedMatches: [] };
    
    const allResults = smartSearchEvents(pool, query);
    const exactMatches: EventType[] = [];
    const relatedMatches: EventType[] = [];
    
    const exactMatchThreshold = 20; // Needs at least one strong keyword match in an important field
    const possibleRelatedThreshold = 2; // Very low threshold to catch any partial/synonym hit

    allResults.forEach(e => {
      const similarityScore = calculateSearchScore(e, query);
      if (similarityScore >= possibleRelatedThreshold) {
        if (similarityScore >= exactMatchThreshold) {
          exactMatches.push(e);
        } else {
          relatedMatches.push(e);
        }
      }
    });

    return { exactMatches, relatedMatches };
  }, [pool, query]);

  const exactIds = useMemo(() => new Set(exactMatches.map(e => e.id)), [exactMatches]);

  // "You May Also Like" / Personalized Recommendations
  const youMayAlsoLike = useMemo(() => {
    const userPrefs = currentUser?.preferences || [];
    const savedIds = new Set(currentUser?.savedEventIds || []);
    const interestedIds = new Set(currentUser?.interestedEventIds || []);

    let history: string[] = [];
    try {
      history = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    } catch(e) {}

    const historyTerms = new Set<string>();
    history.forEach(h => {
       expandQuery(h).forEach(t => historyTerms.add(t));
    });

    // Dynamically infer categories and expand terms from the current query
    const inferredCats  = query.trim() ? inferCategories(query) : [];
    const queryTerms    = query.trim() ? new Set(expandQuery(query)) : new Set<string>();

    const shownIds = new Set([...exactIds, ...relatedMatches.map(e => e.id)]);

    const scored = pool
      .filter(e => !shownIds.has(e.id))
      .map(e => {
        let score = 0;
        const cats     = Array.isArray(e.category) ? e.category : [e.category];
        const lowerName = e.name.toLowerCase();
        const lowerDesc = (e.description || '').toLowerCase();

        // 1. PRIMARY: inferred category match (catches "chess" → Sports, "stress" → Health, etc.)
        if (inferredCats.length > 0 && cats.some(c => inferredCats.includes(c))) score += 20;

        // 2. Expanded concept terms match name / description
        queryTerms.forEach(term => {
          if (lowerName.includes(term)) score += 10;
          if (cats.some(c => c.toLowerCase().includes(term))) score += 8;
          if (lowerDesc.includes(term)) score += 3;
        });

        // 3. User preference match
        if (cats.some(c => userPrefs.includes(c))) score += 6;

        // 4. Saved / interested events
        if (savedIds.has(e.id)) score += 5;
        if (interestedIds.has(e.id)) score += 3;

        // 5. History term matches
        let historyMatch = false;
        historyTerms.forEach(term => {
          if (lowerName.includes(term)) historyMatch = true;
          if (cats.some(c => c.toLowerCase().includes(term))) historyMatch = true;
        });
        if (historyMatch) score += 4;

        // 6. Same category / department as exact matches
        if (exactMatches.length > 0) {
          const resultDepts = new Set(exactMatches.map(r => r.leadOffice).filter(Boolean));
          if (e.leadOffice && resultDepts.has(e.leadOffice)) score += 3;
          const resultCats = new Set(exactMatches.flatMap(r => Array.isArray(r.category) ? r.category : [r.category]));
          if (cats.some(c => resultCats.has(c))) score += 4;
        }

        return { event: e, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // Deduplicate recurring series — keep only the nearest upcoming occurrence
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const groupBest = new Map<string, typeof scored[number]>();
    const nonRecurring: typeof scored = [];

    for (const s of scored) {
      const gid = s.event.recurrenceGroupId;
      if (!gid) { nonRecurring.push(s); continue; }
      const existing = groupBest.get(gid);
      if (!existing) { groupBest.set(gid, s); continue; }
      const newDate = new Date((s.event.date || '') + 'T00:00:00');
      const exDate  = new Date((existing.event.date || '') + 'T00:00:00');
      const newFuture = newDate >= today;
      const exFuture  = exDate  >= today;
      if (newFuture && !exFuture) groupBest.set(gid, s);
      else if (newFuture && exFuture && newDate < exDate) groupBest.set(gid, s);
      else if (!newFuture && !exFuture && newDate > exDate) groupBest.set(gid, s);
    }

    return [...nonRecurring, ...Array.from(groupBest.values())]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.event);
  }, [pool, exactIds, relatedMatches, currentUser, exactMatches, query]);

  const hasQuery = query.trim().length > 0;
  const hasExactMatches = exactMatches.length > 0;
  const hasRelatedMatches = relatedMatches.length > 0;
  const hasPersonalized = youMayAlsoLike.length > 0;



  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 min-h-screen">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={liveQuery}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { setQuery(liveQuery); setIsSearching(false); }
              }}
              placeholder="Search events, categories, departments..."
              className="w-full pl-9 pr-9 py-2 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-gray-700 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none transition-all"
            />
            {liveQuery && (
              <button
                onClick={() => { setLiveQuery(''); setQuery(''); setIsSearching(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Result count strip */}
        {hasQuery && !isSearching && (
          <div className="px-4 pb-2.5 max-w-5xl mx-auto">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasExactMatches
                ? <><span className="font-bold text-gray-800 dark:text-gray-100">{exactMatches.length}</span> exact match{exactMatches.length !== 1 ? 'es' : ''} for "<span className="font-semibold text-primary-600 dark:text-primary-400">{query}</span>"</>
                : <>No exact matches for "<span className="font-semibold text-primary-600 dark:text-primary-400">{query}</span>"</>
              }
            </p>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">

          {/* Loading skeleton */}
          {isSearching && (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {/* Empty prompt — no query */}
          {!hasQuery && !isSearching && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-primary-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Search for Events</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Try keywords like <span className="font-semibold">job</span>, <span className="font-semibold">health</span>, <span className="font-semibold">sports</span>, or <span className="font-semibold">concert</span>.
              </p>

              {/* Quick search chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {['Job Fair', 'Health', 'Sports', 'Concert', 'Workshop', 'Community'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => { setLiveQuery(chip); setQuery(chip); }}
                    className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all shadow-sm"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Main results ── */}
          {hasQuery && !isSearching && (
            <>
              {hasExactMatches ? (
                <section>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary-500" />
                    Search Results
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exactMatches.map(event => (
                      <SearchResultCard key={event.id} event={event} onSelect={onEventSelect} />
                    ))}
                  </div>
                </section>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex gap-3 text-amber-800 dark:text-amber-200 mb-6">
                  <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-sm">
                    <strong>No exact matches found for "{query}".</strong> 
                    {hasRelatedMatches ? " Here are events related to your search." : ""}
                  </p>
                </div>
              )}

              {/* ── Suggested Related Events ── */}
              {!hasExactMatches && hasRelatedMatches && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-purple-500/20">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-800 dark:text-white">
                        Suggested Related Events
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Events that may be related to your search.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedMatches.map(event => (
                      <SearchResultCard key={event.id} event={event} onSelect={onEventSelect} />
                    ))}
                  </div>
                </section>
              )}

              {!hasExactMatches && !hasRelatedMatches && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">No related events found</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    Try searching for another keyword. We couldn't find any exact or related events for "<span className="font-semibold">{query}</span>".
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {['Job Fair', 'Health', 'Sports', 'Concert', 'Workshop'].map(chip => (
                      <button
                        key={chip}
                        onClick={() => { setLiveQuery(chip); setQuery(chip); }}
                        className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all shadow-sm"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── You May Also Like ── */}
              {hasPersonalized && (
                <section className={(hasExactMatches || hasRelatedMatches) ? "pt-6 mt-6 border-t border-gray-100 dark:border-gray-800" : ""}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-800 dark:text-white">
                        You May Also Like
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Based on your recent searches and activity</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {youMayAlsoLike.map(event => (
                      <RecommendationCard
                        key={event.id}
                        event={event}
                        onSelect={onEventSelect}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
