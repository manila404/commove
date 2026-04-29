
import React, { useState } from 'react';
import { BookmarkIcon, ShieldCheckIcon, GlobeIcon, LockIcon } from '../constants';
import EventList from './EventList';
import type { EventType, DisplayEventType } from '../types';

interface MyEventsViewProps {
  savedEvents: DisplayEventType[];
  participatedEvents: DisplayEventType[];
  onBack: () => void;
  onEventSelect: (event: EventType) => void;
  onToggleSave: (eventId: string) => void;
}

const MyEventsView: React.FC<MyEventsViewProps> = ({ 
    savedEvents, 
    participatedEvents, 
    onBack, 
    onEventSelect, 
    onToggleSave 
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'participated'>('saved');
  
  const privateParticipated = participatedEvents.filter(e => e.isPrivate);
  const publicParticipated = participatedEvents.filter(e => !e.isPrivate);

  const hasEvents = savedEvents.length > 0 || participatedEvents.length > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <main className="container mx-auto p-4 md:p-6 animate-fade-in-up">
        <div className="flex flex-col gap-1 mb-8">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">My Events</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manage your saved and registered events.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 max-w-md">
            <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'saved'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                <BookmarkIcon className="w-4 h-4" />
                <span>Saved</span>
                {savedEvents.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        activeTab === 'saved' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-gray-200 dark:bg-gray-900/50 text-gray-500'
                    }`}>
                        {savedEvents.length}
                    </span>
                )}
            </button>
            <button
                onClick={() => setActiveTab('participated')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'participated'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Participated</span>
                {participatedEvents.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        activeTab === 'participated' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-gray-200 dark:bg-gray-900/50 text-gray-500'
                    }`}>
                        {participatedEvents.length}
                    </span>
                )}
            </button>
        </div>

        {!hasEvents ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-6">
                    <BookmarkIcon className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Events Found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs leading-relaxed">
                    Events you save or participate in will appear here. Browse the feed to find events you're interested in.
                </p>
            </div>
        ) : (
            <div className="animate-fade-in">
                {/* Saved Tab Content */}
                {activeTab === 'saved' && (
                    <div className="space-y-6">
                        {savedEvents.length > 0 ? (
                            <EventList 
                                events={savedEvents} 
                                onEventSelect={onEventSelect} 
                                onToggleSave={onToggleSave} 
                            />
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">You haven't saved any events yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Participated Tab Content */}
                {activeTab === 'participated' && (
                    <div className="space-y-12 pb-10">
                        {/* Private Events Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                                <LockIcon className="w-5 h-5 text-amber-600" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Private Events</h3>
                                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {privateParticipated.length}
                                </span>
                            </div>
                            {privateParticipated.length > 0 ? (
                                <EventList 
                                    events={privateParticipated} 
                                    onEventSelect={onEventSelect} 
                                    onToggleSave={onToggleSave} 
                                />
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No private event registrations found.</p>
                            )}
                        </section>

                        {/* Public Events Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                                <GlobeIcon className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Public Events</h3>
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {publicParticipated.length}
                                </span>
                            </div>
                            {publicParticipated.length > 0 ? (
                                <EventList 
                                    events={publicParticipated} 
                                    onEventSelect={onEventSelect} 
                                    onToggleSave={onToggleSave} 
                                />
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No public event activity found.</p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default MyEventsView;
