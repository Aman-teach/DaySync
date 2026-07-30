import { useMemo } from 'react';
import type { Entry } from '@/types';
import { generateLookbackKeys } from '../utils/statsDateUtils';
import { calculateFocusScore } from '../utils/statsAggregations';
import { getEntriesForDate } from '@/utils/helpers';

/**
 * Hook responsible solely for generating the 2D matrix used by the heatmap.
 * Deeply memoizes the array iteration to prevent 112 date allocations per render.
 */
export function useHeatmapData(entries: Entry[], dayStartHour: number, days = 70) {
  return useMemo(() => {
    const safeEntries = Array.isArray(entries) ? entries : [];
    
    // Only generate the array of date keys once per render dependency graph
    const keys = generateLookbackKeys(days, dayStartHour);
    
    const heatmap: Record<string, number> = {};
    
    // Build the exact map expected by HeatmapCalendar
    for (const key of keys) {
      const dayEntries = getEntriesForDate(safeEntries, key);
      if (dayEntries.length > 0) {
        // We use the date representation of the key so decay logic matches the mapped day
        heatmap[key] = calculateFocusScore(dayEntries, new Date(key));
      }
    }
    
    return heatmap;
  }, [entries, dayStartHour, days]);
}
