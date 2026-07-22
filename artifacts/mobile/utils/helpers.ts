import { Entry, FocusLevel } from '@/types';

export function getDateKey(date: Date = new Date(), dayStartHour = 4): string {
  const d = new Date(date);
  if (d.getHours() < dayStartHour) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}${suffix}`;
}

export function getFocusScore(entries: Entry[]): number {
  if (entries.length === 0) return 0;
  const deep = entries.filter(e => e.focus === 'deep').length;
  const light = entries.filter(e => e.focus === 'light').length;
  return Math.round(((deep + light * 0.5) / entries.length) * 100);
}

export function getTodayEntries(entries: Entry[], dayStartHour = 4): Entry[] {
  const key = getDateKey(new Date(), dayStartHour);
  return entries
    .filter(e => e.dateKey === key)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getEntriesForDate(entries: Entry[], dateKey: string): Entry[] {
  return entries
    .filter(e => e.dateKey === dateKey)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getTagBreakdown(entries: Entry[], interval: number): Record<string, number> {
  const bd: Record<string, number> = {};
  for (const entry of entries) {
    for (const tag of entry.tags) {
      bd[tag] = (bd[tag] ?? 0) + interval;
    }
  }
  return bd;
}

export function getFocusStreaks(entries: Entry[]): number[] {
  if (!entries.length) return [];
  const streaks: number[] = [];
  let current = 0;
  for (const entry of entries) {
    if (entry.focus === 'deep') {
      current++;
    } else {
      if (current > 0) { streaks.push(current); current = 0; }
    }
  }
  if (current > 0) streaks.push(current);
  return streaks;
}

export function getConsecutiveDayStreak(entries: Entry[], dayStartHour = 4): number {
  const daySet = new Set(entries.filter(e => e.focus !== 'off').map(e => e.dateKey));
  let streak = 0;
  const today = getDateKey(new Date(), dayStartHour);
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = getDateKey(d, dayStartHour);
    if (daySet.has(key)) {
      streak++;
    } else if (key === today) {
      // ok, today may not have entries yet
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getLast30DayKeys(dayStartHour = 4): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    keys.unshift(getDateKey(d, dayStartHour));
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

export function getDeepWorkByHour(entries: Entry[]): number[] {
  const counts = new Array(24).fill(0);
  for (const entry of entries) {
    if (entry.focus === 'deep') {
      const hour = new Date(entry.createdAt).getHours();
      counts[hour]++;
    }
  }
  return counts;
}
