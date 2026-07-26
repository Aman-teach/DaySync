import type { Entry } from '@/types';
import { getDateKey } from '@/utils/helpers';

/**
 * Generates an array of date keys for lookback operations (like the heatmap).
 * Extracting this into a pure function isolates array recreation.
 */
export function generateLookbackKeys(days: number, dayStartHour: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = 0; i < days; i++) {
    keys.unshift(getDateKey(d, dayStartHour));
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

/**
 * Filters an array of entries to only include those from the last N days.
 */
export function filterEntriesByDateRange(entries: Entry[], daysAgo: number): Entry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);
  return entries.filter(e => new Date(e.createdAt) >= cutoff);
}
