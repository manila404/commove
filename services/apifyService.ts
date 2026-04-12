
import type { EventType } from '../types';

export const runBacoorEventScraper = async (
  onProgress: (status: string) => void,
  userApiToken?: string
): Promise<Partial<EventType>[]> => {
  throw new Error("The Apify Scraper has been replaced by the free 'AI Event Importer'. Please use the text input in the Admin Panel to extract events from announcements.");
};
