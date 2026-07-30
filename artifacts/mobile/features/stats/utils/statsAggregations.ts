import type { Entry } from '@/types';
import { getDateKey, getFocusScore } from '@/utils/helpers';

/**
 * Thin wrapper around the single source-of-truth scoring function in helpers.ts.
 * Stats and Today tab must always show the same number — one function, one result.
 * The referenceDate param is kept for API compatibility but is unused
 * (getFocusScore detects today internally using getDateKey).
 */
export function calculateFocusScore(entries: Entry[], _referenceDate?: Date): number {
  return getFocusScore(entries);
}



/**
 * Aggregates total minutes spent per tag.
 * Returns sorted array of tuples for UI rendering.
 */
export function aggregateTagMinutes(entries: Entry[]): [string, number][] {
  const bd: Record<string, number> = {};
  for (const e of entries) {
    if (!e.tags || !Array.isArray(e.tags)) continue;
    for (const tag of e.tags) {
      bd[tag] = (bd[tag] || 0) + (e.intervalMinutes || 0);
    }
  }
  return Object.entries(bd).sort((a, b) => b[1] - a[1]);
}

/**
 * Aggregates total minutes spent per task.
 * Returns sorted array of tuples for UI rendering.
 */
export function aggregateTaskMinutes(entries: Entry[]): [string, { title: string, mins: number }][] {
  const bd: Record<string, { title: string, mins: number }> = {};
  for (const e of entries) {
    if (!e.taskId) continue;
    if (!bd[e.taskId]) {
      bd[e.taskId] = { title: e.taskTitle || 'Unknown Task', mins: 0 };
    }
    bd[e.taskId].mins += (e.intervalMinutes || 0);
  }
  return Object.entries(bd).sort((a, b) => b[1].mins - a[1].mins);
}

/**
 * Aggregates total minutes spent per domain.
 * Returns sorted array of tuples: [domainId, minutes]
 */
export function aggregateDomainMinutes(entries: Entry[]): [string, number][] {
  const bd: Record<string, number> = {};
  for (const e of entries) {
    if (!e.domainId) continue;
    bd[e.domainId] = (bd[e.domainId] || 0) + (e.intervalMinutes || 0);
  }
  return Object.entries(bd).sort((a, b) => b[1] - a[1]);
}

/**
 * Aggregates total minutes spent per activity.
 * Returns sorted array of tuples: [activityId, minutes]
 */
export function aggregateActivityMinutes(entries: Entry[]): [string, number][] {
  const bd: Record<string, number> = {};
  for (const e of entries) {
    if (!e.activityId) continue;
    bd[e.activityId] = (bd[e.activityId] || 0) + (e.intervalMinutes || 0);
  }
  return Object.entries(bd).sort((a, b) => b[1] - a[1]);
}
