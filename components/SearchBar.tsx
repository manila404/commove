import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Trash2, MapPin, Calendar } from 'lucide-react';
import type { EventType } from '../types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  events: any[];
  onEventSelect: (event: any) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, events = [], onEventSelect }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    const newHistory = [searchTerm, ...history.filter(h => h !== searchTerm)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('recent_searches', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('recent_searches');
  };

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    saveToHistory(searchTerm);
    onSearch(searchTerm);
    setIsFocused(false);
  };

  const suggestions = query.trim() 
    ? events.filter(e => 
        (e.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (Array.isArray(e.category) ? e.category : [e.category]).some(cat => 
          (cat || '').toLowerCase().includes(query.toLowerCase())
        ) ||
        (e.venue || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative group" ref={dropdownRef}>
      {/* Backdrop for focus */}
      {isFocused && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[1000] transition-opacity duration-300" 
          onClick={() => setIsFocused(false)}
        />
      )}

      <form 
        onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} 
        className="relative z-[1001]"
      >
        <div className="absolute inset-y-0 left-0 pl-3.5 md:pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-purple-600">
          <Search size={16} className={`md:w-[18px] md:h-[18px] ${isFocused ? 'text-purple-600' : 'text-gray-400 dark:text-gray-500'}`} />
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, venues, or categories..."
          className={`w-full pl-10 md:pl-11 pr-10 md:pr-12 py-2.5 md:py-3.5 bg-white dark:bg-gray-800 border-2 rounded-[15px] text-sm md:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all duration-300 ${isFocused ? 'border-purple-500 ring-4 ring-purple-500/10' : 'border-gray-100 dark:border-gray-700 shadow-sm hover:border-gray-200'}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSearch(''); }}
            className="absolute inset-y-0 right-3.5 md:right-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
        )}
      </form>

      {/* Suggested & History Dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[24px] shadow-2xl z-[1001] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Recent Searches */}
          {(!query && history.length > 0) && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Recent Searches</span>
                <button 
                  onClick={clearHistory}
                  className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 uppercase tracking-wide px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={12} />
                  Clear All
                </button>
              </div>
              <div className="space-y-1">
                {history.map((term, i) => (
                  <button
                    key={term + i}
                    onClick={() => handleSearch(term)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left group"
                  >
                    <Clock size={14} className="text-gray-400 group-hover:text-purple-500" />
                    <span className="text-sm font-medium">{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {query.trim() && (
            <div className="p-4">
              <div className="px-2 mb-3">
                <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Suggested Events</span>
              </div>
              {suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map(event => (
                    <button
                      key={event.id}
                      onClick={() => {
                        onEventSelect(event);
                        setIsFocused(false);
                        saveToHistory(query);
                      }}
                      className="w-full flex items-center gap-4 p-2.5 bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-50 dark:border-gray-700 rounded-2xl transition-all text-left shadow-sm group"
                    >
                      {event.imageUrl ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-600 transform group-hover:scale-105 transition-transform">
                          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-600 border border-purple-100 dark:border-purple-800/30">
                          <Search size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">{event.name}</h4>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            <MapPin size={10} className="flex-shrink-0" />
                            <span>{event.venue}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                            <Calendar size={10} className="flex-shrink-0" />
                            <span>{event.date}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Search size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">No events found matching "{query}"</p>
                  <p className="text-[11px] text-gray-300 dark:text-gray-600">Try common keywords like 'Concert'</p>
                </div>
              )}
            </div>
          )}

          {/* Prompt to see all if results more than 4 */}
          {suggestions.length === 4 && (
            <button 
              onClick={() => handleSearch(query)}
              className="w-full py-3 bg-gray-50/50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700"
            >
              See all results matching "{query}"
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default SearchBar;