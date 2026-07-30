import { useMemo } from 'react';
import type { Entry } from '@/types';
import { calculateFocusScore } from '../utils/statsAggregations';
import { getEntriesForDate, getDateKey, getTimeWasted, getConsecutiveDayStreak, getDeepWorkByHour } from '@/utils/helpers';

/**
 * Orchestrator hook for the core Stats logic.
 * Safely memoizes complex data transformations based solely on entries.
 * Does not render UI or access context.
 */
export function useStatsData(entries: Entry[], dayStartHour: number) {
  return useMemo(() => {
    // Defensive fallback just in case validation missed something
    const safeEntries = Array.isArray(entries) ? entries : [];
    
    // Date generation
    const today = new Date();
    const todayKey = getDateKey(today, dayStartHour);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday, dayStartHour);

    // Filter sets
    const todayEntries = getEntriesForDate(safeEntries, todayKey);
    const yesterdayEntries = getEntriesForDate(safeEntries, yesterdayKey);

    // Core Scores
    const todayScore = calculateFocusScore(todayEntries, today);
    const yesterdayScore = calculateFocusScore(yesterdayEntries, yesterday);
    const scoreDelta = todayScore - yesterdayScore;

    // Time Leaks
    const todayWasted = getTimeWasted(todayEntries);
    const yesterdayWasted = getTimeWasted(yesterdayEntries);
    const wasteDelta = todayWasted - yesterdayWasted;

    // Focus Mix Ring — supports both new (normal/distracted) and legacy (light/off) entries
    const allDeep       = safeEntries.filter(e => e.focus === 'deep').length;
    const allNormal     = safeEntries.filter(e => e.focus === 'normal' || e.focus === 'light').length;
    const allNeutral    = safeEntries.filter(e => e.focus === 'neutral').length;
    const allDistracted = safeEntries.filter(e => e.focus === 'distracted' || e.focus === 'off').length;
    const allTotal      = safeEntries.length;

    // Streak & Patterns
    const streak = getConsecutiveDayStreak(safeEntries, dayStartHour);
    const deepByHour = getDeepWorkByHour(safeEntries);
    const maxDeepByHour = Math.max(...deepByHour, 1);

    const ringSegments = [
      { value: allDeep,       color: '#52B788', label: 'Deep' },
      { value: allNormal,     color: '#60A5FA', label: 'Normal' },
      { value: allNeutral,    color: '#818CF8', label: 'Neutral' },
      { value: allDistracted, color: '#F87171', label: 'Distracted' },
    ].filter(s => s.value > 0); // only show segments that exist

    // Derived scalars used by the presentation layer.
    const deepRate = allTotal > 0 ? Math.round((allDeep / allTotal) * 100) : 0;
    const hasYesterdayData = yesterdayEntries.length > 0;
    const hasTodayData = todayEntries.length > 0;

    return {
      todayScore,
      yesterdayScore,
      scoreDelta,
      wasteDelta,
      ringSegments,
      allTotal,
      allDeep,
      todayEntries,
      yesterdayEntries,
      streak,
      deepByHour,
      maxDeepByHour,
      deepRate,
      hasYesterdayData,
      hasTodayData,
    };
  }, [entries, dayStartHour]);
}
