import { useMemo, useState } from 'react';
import type { Entry } from '@/types';
import { aggregateTagMinutes, aggregateTaskMinutes } from '../utils/statsAggregations';
import { filterEntriesByDateRange } from '../utils/statsDateUtils';

export type Timeframe = 'today' | 'yesterday' | 'week' | 'all';

/**
 * Hook responsible for holding timeframe state (UI toggles) and memoizing
 * the heavy aggregations for tags and tasks based on the selected timeframe.
 */
export function useTimeframeData(
  allEntries: Entry[], 
  todayEntries: Entry[], 
  yesterdayEntries: Entry[]
) {
  // State is owned by this hook, not the container
  const [tagTimeframe, setTagTimeframe] = useState<Timeframe>('all');
  const [taskTimeframe, setTaskTimeframe] = useState<Timeframe>('today');

  // Heavy aggregation memoized based ONLY on selected timeframe and data subset
  const tagMinutes = useMemo(() => {
    let target = allEntries;
    if (tagTimeframe === 'today') target = todayEntries;
    else if (tagTimeframe === 'yesterday') target = yesterdayEntries;
    else if (tagTimeframe === 'week') target = filterEntriesByDateRange(allEntries, 7);
    
    // Aggregate and slice the top 8
    return aggregateTagMinutes(target).slice(0, 8); 
  }, [tagTimeframe, allEntries, todayEntries, yesterdayEntries]);

  // Heavy task aggregation memoized
  const taskBreakdown = useMemo(() => {
    let target = allEntries;
    if (taskTimeframe === 'today') target = todayEntries;
    else if (taskTimeframe === 'yesterday') target = yesterdayEntries;
    else if (taskTimeframe === 'week') target = filterEntriesByDateRange(allEntries, 7);
    
    // Aggregate and slice the top 8
    return aggregateTaskMinutes(target).slice(0, 8);
  }, [taskTimeframe, allEntries, todayEntries, yesterdayEntries]);

  const maxTagMin = useMemo(() => Math.max(...tagMinutes.map(t => t[1]), 1), [tagMinutes]);
  const maxTaskMin = useMemo(() => Math.max(...taskBreakdown.map(t => t[1].mins), 1), [taskBreakdown]);

  return {
    tagTimeframe,
    setTagTimeframe,
    tagMinutes,
    maxTagMin,
    taskTimeframe,
    setTaskTimeframe,
    taskBreakdown,
    maxTaskMin
  };
}
