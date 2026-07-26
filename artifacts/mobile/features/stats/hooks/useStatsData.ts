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

    // Focus Mix Ring calculations
    const allDeep = safeEntries.filter(e => e.focus === 'deep').length;
    const allLight = safeEntries.filter(e => e.focus === 'light').length;
    const allOff = safeEntries.filter(e => e.focus === 'off').length;
    const allTotal = safeEntries.length;

    // Streak & Patterns
    const streak = getConsecutiveDayStreak(safeEntries, dayStartHour);
    const deepByHour = getDeepWorkByHour(safeEntries);
    const maxDeepByHour = Math.max(...deepByHour, 1);

    const ringSegments = [
      { value: allDeep, color: '#2D6A4F', label: 'Deep' },
      { value: allLight, color: '#E8A838', label: 'Light' },
      { value: allOff, color: '#9CA3AF', label: 'Off' },
    ];

    // Derived scalars used by the presentation layer.
    // Computed here so StatsScreenV2 remains purely declarative.
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
