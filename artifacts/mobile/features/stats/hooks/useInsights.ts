import { useMemo } from 'react';
import type { Entry, Domain } from '@/types';

export interface InsightItem {
  id: string;
  icon: string;      // Feather icon name
  color: string;     // Accent hex color
  title: string;     // Concise headline
  description: string; // Actionable, intelligent observation
  badge?: string;    // Short uppercase metric tag
}

/**
 * Hook responsible for generating intelligent, heuristic "Observations" and patterns
 * based on user data, time distribution, deep focus density, and domain allocation.
 */
export function useInsights(
  entries: Entry[], 
  allTotal: number, 
  allDeep: number, 
  streak: number,
  domains?: Domain[]
): InsightItem[] {
  return useMemo(() => {
    if (!entries || entries.length === 0) return [];
    
    const results: InsightItem[] = [];

    // 1. Peak Productivity Window (Morning / Afternoon / Evening / Night)
    let morningMin = 0;
    let afternoonMin = 0;
    let eveningMin = 0;
    let nightMin = 0;

    entries.forEach(e => {
      if (e.focus === 'deep' || e.focus === 'normal') {
        const h = new Date(e.createdAt).getHours();
        const dur = e.duration || e.intervalMinutes || 0;
        if (h >= 5 && h < 12) morningMin += dur;
        else if (h >= 12 && h < 17) afternoonMin += dur;
        else if (h >= 17 && h < 23) eveningMin += dur;
        else nightMin += dur;
      }
    });

    const maxWindowMin = Math.max(morningMin, afternoonMin, eveningMin, nightMin);
    const totalFocusMin = morningMin + afternoonMin + eveningMin + nightMin;
    const peakPct = totalFocusMin > 0 ? Math.round((maxWindowMin / totalFocusMin) * 100) : 0;

    if (maxWindowMin > 0 && totalFocusMin >= 60) {
      if (maxWindowMin === morningMin) {
        results.push({
          id: 'peak-morning',
          icon: 'sun',
          color: '#F59E0B', // Amber
          title: 'Morning Prime Time',
          description: `You log ${peakPct}% of your productive focus before noon. Try scheduling your highest-priority creative tasks during this morning window.`,
          badge: `${peakPct}% AM FOCUS`
        });
      } else if (maxWindowMin === afternoonMin) {
        results.push({
          id: 'peak-afternoon',
          icon: 'clock',
          color: '#3B82F6', // Blue
          title: 'Afternoon Execution',
          description: `Your peak output happens between 12 PM and 5 PM (${peakPct}% of focus time). Protect your early afternoon from unnecessary context switching.`,
          badge: `${peakPct}% AFTERNOON`
        });
      } else if (maxWindowMin === eveningMin) {
        results.push({
          id: 'peak-evening',
          icon: 'moon',
          color: '#8B5CF6', // Purple
          title: 'Evening Peak Performance',
          description: `You get your most meaningful focus between 5 PM and 11 PM (${peakPct}% of focus time). Lean into this evening creative rhythm.`,
          badge: `${peakPct}% PM FOCUS`
        });
      } else {
        results.push({
          id: 'peak-night',
          icon: 'zap',
          color: '#6366F1', // Indigo
          title: 'Late-Night Deep Work',
          description: `You hit deep focus late at night (${peakPct}% of focus time). Ensure you maintain a consistent recovery and sleep schedule.`,
          badge: `${peakPct}% LATE NIGHT`
        });
      }
    }

    // 2. Deep Focus Quality & Density
    const deepPct = allTotal > 0 ? Math.round((allDeep / allTotal) * 100) : 0;
    if (allTotal >= 60) {
      if (deepPct >= 50) {
        results.push({
          id: 'deep-high',
          icon: 'shield',
          color: '#10B981', // Green
          title: 'High Focus Density',
          description: `${deepPct}% of your logged time is deep focus. You're successfully insulating your attention from distractions and busywork.`,
          badge: `${deepPct}% DEEP`
        });
      } else if (deepPct < 30) {
        results.push({
          id: 'deep-low',
          icon: 'alert-triangle',
          color: '#EF4444', // Red
          title: 'Attention Fragmentation',
          description: `Only ${deepPct}% of your time is deep focus. Notice if frequent context switching or small reactive tasks are breaking up longer blocks.`,
          badge: `${deepPct}% DEEP`
        });
      } else {
        results.push({
          id: 'deep-balanced',
          icon: 'activity',
          color: '#3B82F6', // Blue
          title: 'Balanced Focus Rhythm',
          description: `You maintain a steady ${deepPct}% deep focus ratio balanced with necessary administrative and collaboration tasks.`,
          badge: `${deepPct}% DEEP`
        });
      }
    }

    // 3. Dominant Domain / Focus Area
    if (domains && domains.length > 0) {
      const domainTotals: Record<string, number> = {};
      entries.forEach(e => {
        if (e.domainId) {
          domainTotals[e.domainId] = (domainTotals[e.domainId] || 0) + (e.duration || e.intervalMinutes || 0);
        }
      });
      let topDomainId: string | null = null;
      let topDomainMin = 0;
      Object.entries(domainTotals).forEach(([dId, min]) => {
        if (min > topDomainMin) {
          topDomainMin = min;
          topDomainId = dId;
        }
      });
      if (topDomainId && topDomainMin >= 45) {
        const dObj = domains.find(d => d.id === topDomainId);
        if (dObj) {
          const hours = (topDomainMin / 60).toFixed(1);
          results.push({
            id: 'top-domain',
            icon: dObj.icon || 'folder',
            color: dObj.color || '#6366F1',
            title: `${dObj.name} Dominance`,
            description: `You've invested ${hours}h in ${dObj.name} recently. Ensure your time allocation aligns with your top goals for this period.`,
            badge: `${hours}h TOTAL`
          });
        }
      }
    }

    // 4. Streak / Consistency
    if (streak >= 3) {
      results.push({
        id: 'streak-high',
        icon: 'trending-up',
        color: '#10B981', // Green
        title: 'Momentum Building',
        description: `You've logged consistently for ${streak} days straight. Continuous self-tracking is compounding your daily awareness.`,
        badge: `${streak} DAYS`
      });
    }

    // Fallback if data is too small to trigger rules above
    if (results.length === 0 && entries.length > 0) {
      results.push({
        id: 'getting-started',
        icon: 'compass',
        color: '#6366F1',
        title: 'Gathering Your Rhythm',
        description: `Keep logging sessions across different times of day. AI observations will automatically reveal your peak focus windows and productivity patterns.`,
        badge: 'ACTIVE'
      });
    }

    return results.slice(0, 4);
  }, [entries, allDeep, allTotal, streak, domains]);
}
