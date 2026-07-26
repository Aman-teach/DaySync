import { useMemo } from 'react';
import type { Entry } from '@/types';

/**
 * Hook responsible for generating the heuristic "Patterns" or insights
 * based on user data. Memoized heavily as it loops over the entire dataset.
 */
export function useInsights(
  entries: Entry[], 
  allTotal: number, 
  allDeep: number, 
  streak: number
) {
  return useMemo(() => {
    if (!entries || entries.length < 5) return [];
    
    const results: string[] = [];

    const totalOff = entries.filter(e => e.focus === 'off').length;
    const totalDeep = entries.filter(e => e.focus === 'deep').length;
    
    if (totalOff > totalDeep && entries.length > 10) {
      results.push('You are logging more off-focus time than deep focus.');
    }

    let morningCount = 0;
    let eveningCount = 0;
    entries.forEach(e => {
      if (e.focus === 'deep') {
        const h = new Date(e.createdAt).getHours();
        if (h >= 5 && h <= 11) morningCount++;
        else if (h >= 17 && h <= 23) eveningCount++;
      }
    });

    if (morningCount > eveningCount && morningCount > 3) {
      results.push('You do your best deep work in the mornings.');
    } else if (eveningCount > morningCount) {
      results.push('You get meaningful work done in the evenings.');
    }

    const deepPct = allTotal > 0 ? (allDeep / allTotal) * 100 : 0;
    if (deepPct >= 60) results.push(`${Math.round(deepPct)}% of your logged time is deep focus — well above average.`);
    else if (deepPct < 30 && allTotal > 5) results.push('Less than a third of your time is deep focus — there may be room to protect your attention more.');

    if (streak >= 7) results.push(`${streak}-day streak — you're building a consistent rhythm.`);

    return results.slice(0, 3);
  }, [entries, allDeep, allTotal, streak]);
}
