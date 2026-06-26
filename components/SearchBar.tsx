import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Trash2 } from 'lucide-react';
import { EventImage } from '../constants';
import { smartSearchEvents } from '../utils/searchUtils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  events: any[];
  onEventSelect: (event: any) => void;
  onViewAll?: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, events = [], onEventSelect, onViewAll }) => {
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
    // Don't filter the main feed — search results live only in the dropdown
    setIsFocused(false);
  };

  const handleViewAll = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    saveToHistory(searchTerm);
    setIsFocused(false);
    if (onViewAll) {
      onViewAll(searchTerm);
    }
  };

  const suggestions = query.trim()
    ? smartSearchEvents(events, query).slice(0, 4)
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) handleViewAll(query);
          else handleSearch(query);
        }}
        className="relative"
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
          className={`w-full pl-10 md:pl-11 pr-10 md:pr-12 py-2 md:py-2.5 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all duration-300 ${isFocused ? 'bg-white dark:bg-gray-800 border-2 border-purple-500 ring-4 ring-purple-500/10' : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent'}`}
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Recent Searches */}
          {(!query && history.length > 0) && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Recent searches</span>
                <button
                  onClick={clearHistory}
                  className="text-xs font-semibold text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {history.map((term, i) => (
                  <button
                    key={term + i}
                    onClick={() => handleViewAll(term)}
                    className="flex items-center gap-3 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <Clock size={14} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Events */}
          {query.trim() && (
            <div className="p-4">
              <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-[0.06em]">Suggested Events</span>
              {suggestions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {suggestions.map(event => (
                    <button
                      key={event.id}
                      onClick={() => {
                        onEventSelect(event);
                        setIsFocused(false);
                        saveToHistory(query);
                      }}
                      className="flex items-center gap-3 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-600">
                        <EventImage src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate line-clamp-2 leading-tight">{event.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">No events found matching "{query}"</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Try keywords like 'Concert' or 'Health'</p>
                </div>
              )}
            </div>
          )}

          {/* See all results */}
          {query.trim() && (
            <button
              onClick={() => handleViewAll(query)}
              className="w-full py-3 text-primary-600 dark:text-primary-400 text-xs font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-1.5"
            >
              <Search size={13} />
              See all results for "{query}"
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default SearchBar;