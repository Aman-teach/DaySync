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
  
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  let totalPoints = 0;
  
  // Calculate raw points based on minutes logged
  for (const entry of sorted) {
    // Default to 30 mins if intervalMinutes is missing
    const mins = entry.intervalMinutes || 30;
    const blocks = mins / 30; // How many 30-min blocks this represents

    if (entry.focus === 'deep') {
      totalPoints += blocks * 20; // 20 points per 30m block
    } else if (entry.focus === 'light') {
      totalPoints += blocks * 10; // 10 points per 30m block
    } else if (entry.focus === 'off') {
      totalPoints -= blocks * 10; // -10 points per 30m block
    } else if (entry.focus === 'neutral') {
      totalPoints += 0; // Neutral acts as a check-in to pause decay, but gives 0 points
    }
  }

  // To reach a score of 100, you need 100 points (5 deep blocks = 2.5 hours)
  let baseScore = Math.max(0, Math.min(100, totalPoints));
  
  // Check if these entries are from today
  const lastEntry = sorted[sorted.length - 1];
  const lastEntryDate = new Date(lastEntry.createdAt);
  const isToday = getDateKey(lastEntryDate) === getDateKey(new Date());

  if (isToday) {
    const hoursSinceLastLog = (Date.now() - lastEntryDate.getTime()) / (1000 * 60 * 60);
    // Smart Decay: Give them a 1.5 hour grace period, then decay by 8 points per hour.
    if (hoursSinceLastLog > 1.5) {
      const penalty = (hoursSinceLastLog - 1.5) * 8;
      baseScore = Math.max(0, baseScore - penalty);
    }
  }

  return Math.round(baseScore);
}

export function getDeltaScore(todayEntries: Entry[], yesterdayEntries: Entry[]): number {
  const todayScore = getFocusScore(todayEntries);
  const yesterdayScore = getFocusScore(yesterdayEntries);
  return todayScore - yesterdayScore;
}

export function getTimeWasted(entries: Entry[]): number {
  // Returns total minutes wasted based on 'off' focus level
  return entries.filter(e => e.focus === 'off').reduce((acc, e) => acc + e.intervalMinutes, 0);
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

export function getLast7DayKeys(dayStartHour = 4): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = 0; i < 7; i++) {
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
