import { useMemo, useState } from 'react';
import type { Entry } from '@/types';
import { aggregateTagMinutes, aggregateTaskMinutes, aggregateDomainMinutes, aggregateActivityMinutes } from '../utils/statsAggregations';
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
  const [domainTimeframe, setDomainTimeframe] = useState<Timeframe>('all');
  const [activityTimeframe, setActivityTimeframe] = useState<Timeframe>('all');

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

  // Domain aggregation memoized
  const domainMinutes = useMemo(() => {
    let target = allEntries;
    if (domainTimeframe === 'today') target = todayEntries;
    else if (domainTimeframe === 'yesterday') target = yesterdayEntries;
    else if (domainTimeframe === 'week') target = filterEntriesByDateRange(allEntries, 7);
    return aggregateDomainMinutes(target).slice(0, 8);
  }, [domainTimeframe, allEntries, todayEntries, yesterdayEntries]);

  // Activity aggregation memoized
  const activityMinutes = useMemo(() => {
    let target = allEntries;
    if (activityTimeframe === 'today') target = todayEntries;
    else if (activityTimeframe === 'yesterday') target = yesterdayEntries;
    else if (activityTimeframe === 'week') target = filterEntriesByDateRange(allEntries, 7);
    return aggregateActivityMinutes(target).slice(0, 8);
  }, [activityTimeframe, allEntries, todayEntries, yesterdayEntries]);

  const maxTagMin = useMemo(() => Math.max(...tagMinutes.map(t => t[1]), 1), [tagMinutes]);
  const maxTaskMin = useMemo(() => Math.max(...taskBreakdown.map(t => t[1].mins), 1), [taskBreakdown]);
  const maxDomainMin = useMemo(() => Math.max(...domainMinutes.map(t => t[1]), 1), [domainMinutes]);
  const maxActivityMin = useMemo(() => Math.max(...activityMinutes.map(t => t[1]), 1), [activityMinutes]);

  return {
    tagTimeframe,
    setTagTimeframe,
    tagMinutes,
    maxTagMin,
    taskTimeframe,
    setTaskTimeframe,
    taskBreakdown,
    maxTaskMin,
    domainTimeframe,
    setDomainTimeframe,
    domainMinutes,
    maxDomainMin,
    activityTimeframe,
    setActivityTimeframe,
    activityMinutes,
    maxActivityMin,
  };
}
