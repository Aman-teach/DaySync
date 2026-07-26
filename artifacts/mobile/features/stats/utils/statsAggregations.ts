import type { Entry } from '@/types';
import { getDateKey } from '@/utils/helpers';

/**
 * Pure function to calculate the focus score for a given set of entries.
 * Safe from side effects.
 */
export function calculateFocusScore(entries: Entry[], referenceDate: Date): number {
  if (!entries || entries.length === 0) return 0;
  
  // Sort entries chronologically safely
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let totalPoints = 0;
  
  for (const entry of sorted) {
    const mins = entry.intervalMinutes || 30;
    const blocks = mins / 30;
    if (entry.focus === 'deep') totalPoints += blocks * 20;
    else if (entry.focus === 'light') totalPoints += blocks * 10;
    else if (entry.focus === 'off') totalPoints -= blocks * 10;
  }

  let baseScore = Math.max(0, Math.min(100, totalPoints));
  
  const lastEntry = sorted[sorted.length - 1];
  const lastEntryDate = new Date(lastEntry.createdAt);
  
  // Decay applies ONLY when the entries belong to today.
  // Historical scores (yesterday, last week) are frozen — decay must not
  // retroactively penalize past sessions the user can no longer change.
  const todayKey = getDateKey(new Date());
  const lastEntryIsToday = getDateKey(lastEntryDate) === todayKey;
  
  if (lastEntryIsToday) {
    const hoursSinceLastLog = (Date.now() - lastEntryDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastLog > 1.5) {
      const penalty = (hoursSinceLastLog - 1.5) * 8;
      baseScore = Math.max(0, baseScore - penalty);
    }
  }

  return Math.round(baseScore);
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
