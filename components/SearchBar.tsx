import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Trash2, AlertTriangle } from 'lucide-react';
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
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
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

  const confirmClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('recent_searches');
    setShowClearConfirmModal(false);
  };

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    saveToHistory(searchTerm);
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
    <>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowClearConfirmModal(true);
                    }}
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

      {/* ── Clear History Confirmation Modal ── */}
      {showClearConfirmModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowClearConfirmModal(false);
          }}
        >
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-250">

            {/* Warning icon header */}
            <div className="flex flex-col items-center px-6 pt-8 pb-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Clear Recent Searches?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Are you sure you want to clear all recent searches? This action cannot be undone.
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 dark:bg-gray-800 mx-6" />

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 p-5">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearHistory}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-500/30"
              >
                <Trash2 size={15} />
                Clear Searches
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;