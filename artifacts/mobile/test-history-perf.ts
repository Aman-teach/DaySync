import { getFocusScore, getDateKey, parseDateKeySafely } from './utils/helpers';
import { Entry, DaySummary } from './types';

// 1. Generate Mock Data
const entries: Entry[] = [];
const daySummaries: DaySummary[] = [];

const today = new Date();
for (let i = 0; i < 5000; i++) {
  const date = new Date(today);
  date.setDate(date.getDate() - Math.floor(Math.random() * 365));
  const dateKey = getDateKey(date, 4);
  
  entries.push({
    id: `entry-${i}`,
    text: `Mock entry ${i}`,
    tags: [],
    focus: i % 2 === 0 ? 'deep' : 'light',
    energy: 'high',
    intervalMinutes: 30,
    createdAt: new Date(date.getTime() + Math.random() * 10000000).toISOString(),
    updatedAt: new Date().toISOString(),
    dateKey,
  });

  if (i % 15 === 0) {
    daySummaries.push({
      id: `sum-${i}`,
      dateKey,
      summary: 'Mock summary',
      highlights: [],
      anomalies: [],
      guideAdvice: '',
      tagBreakdown: {},
      focusStreaks: [],
      mood: 'neutral',
      createdAt: new Date().toISOString(),
    } as any);
  }
}

const uniqueSummaries = Array.from(new Map(daySummaries.map(s => [s.dateKey, s])).values());
const settings = { dayStartHour: 4 };

// 2. Define the BEFORE algorithm
function runAlgorithmBefore(timeFilter: '7' | '30' | 'all') {
  const todayDate = new Date();
  const todayKey = getDateKey(todayDate, settings.dayStartHour);
  
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.dateKey]) {
      acc[entry.dateKey] = [];
    }
    acc[entry.dateKey].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>);

  let list = Object.entries(grouped)
    .map(([dateKey, dayEntries]) => {
      const score = getFocusScore(dayEntries);
      const hasWrap = uniqueSummaries.some(s => s.dateKey === dateKey);
      const dateObj = parseDateKeySafely(dateKey);
      return { dateKey, entriesCount: dayEntries.length, score, hasWrap, dateObj, isValidDate: dateObj !== null, isToday: dateKey === todayKey };
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  if (timeFilter !== 'all') {
    const days = parseInt(timeFilter);
    const cutoff = new Date(todayDate);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = getDateKey(cutoff, settings.dayStartHour);
    list = list.filter(item => item.dateKey >= cutoffKey);
  }
  return list;
}

// 3. Define the AFTER algorithm
function runAlgorithmAfter(timeFilter: '7' | '30' | 'all') {
  const todayDate = new Date();
  const todayKey = getDateKey(todayDate, settings.dayStartHour);
  
  let cutoffKey = '';
  if (timeFilter !== 'all') {
    const days = parseInt(timeFilter);
    const cutoff = new Date(todayDate);
    cutoff.setDate(cutoff.getDate() - days);
    cutoffKey = getDateKey(cutoff, settings.dayStartHour);
  }
  
  const summarySet = new Set(uniqueSummaries.map(s => s.dateKey));

  const grouped = entries.reduce((acc, entry) => {
    if (cutoffKey && entry.dateKey < cutoffKey) return acc;
    if (!acc[entry.dateKey]) acc[entry.dateKey] = [];
    acc[entry.dateKey].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>);

  const list = Object.entries(grouped)
    .map(([dateKey, dayEntries]) => {
      const score = getFocusScore(dayEntries);
      const hasWrap = summarySet.has(dateKey);
      const dateObj = parseDateKeySafely(dateKey);
      return { dateKey, entriesCount: dayEntries.length, score, hasWrap, dateObj, isValidDate: dateObj !== null, isToday: dateKey === todayKey };
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  return list;
}

console.log(`Profiling 5000 entries across ~365 days...`);
const filters = ['7', '30', 'all'] as const;

for (const filter of filters) {
  console.log(`\n=== FILTER: ${filter} ===`);
  runAlgorithmBefore(filter);
  runAlgorithmAfter(filter);

  const beforeStart = performance.now();
  for(let i=0; i<10; i++) runAlgorithmBefore(filter);
  const beforeEnd = performance.now();
  console.log(`BEFORE (avg of 10 runs): ${((beforeEnd - beforeStart) / 10).toFixed(2)} ms`);

  const afterStart = performance.now();
  for(let i=0; i<10; i++) runAlgorithmAfter(filter);
  const afterEnd = performance.now();
  console.log(`AFTER  (avg of 10 runs): ${((afterEnd - afterStart) / 10).toFixed(2)} ms`);
  
  const beforeOutput = runAlgorithmBefore(filter);
  const afterOutput = runAlgorithmAfter(filter);
  const matches = beforeOutput.length === afterOutput.length && 
    beforeOutput.every((b, i) => b.dateKey === afterOutput[i].dateKey && b.score === afterOutput[i].score);
    
  console.log(`Outputs Match: ${matches ? '✅ YES' : '❌ NO'} (Before: ${beforeOutput.length}, After: ${afterOutput.length})`);
  if (!matches && filter !== 'all') {
    const beforeKeys = beforeOutput.map(o => o.dateKey);
    const afterKeys = afterOutput.map(o => o.dateKey);
    const extraInAfter = afterKeys.filter(k => !beforeKeys.includes(k));
    console.log(`Extra in After:`, extraInAfter);
  }
}
