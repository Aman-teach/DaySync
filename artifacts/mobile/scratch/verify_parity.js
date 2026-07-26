// Parity Check Script
function getDateKey(date = new Date(), dayStartHour = 4) {
  const d = new Date(date);
  if (d.getHours() < dayStartHour) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------
// OLD IMPLEMENTATIONS
// ------------------------------------------------------------------

function old_getFocusScore(entries) {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let totalPoints = 0;
  for (const entry of sorted) {
    const mins = entry.intervalMinutes || 30;
    const blocks = mins / 30;
    if (entry.focus === 'deep') totalPoints += blocks * 20;
    else if (entry.focus === 'light') totalPoints += blocks * 10;
    else if (entry.focus === 'off') totalPoints -= blocks * 10;
    else if (entry.focus === 'neutral') totalPoints += 0;
  }
  let baseScore = Math.max(0, Math.min(100, totalPoints));
  const lastEntry = sorted[sorted.length - 1];
  const lastEntryDate = new Date(lastEntry.createdAt);
  const isToday = getDateKey(lastEntryDate) === getDateKey(new Date());

  if (isToday) {
    const hoursSinceLastLog = (Date.now() - lastEntryDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastLog > 1.5) {
      const penalty = (hoursSinceLastLog - 1.5) * 8;
      baseScore = Math.max(0, baseScore - penalty);
    }
  }
  return Math.round(baseScore);
}

// ------------------------------------------------------------------
// NEW IMPLEMENTATIONS
// ------------------------------------------------------------------

function new_calculateFocusScore(entries, referenceDate) {
  if (!entries || entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let totalPoints = 0;
  for (const entry of sorted) {
    const mins = entry.intervalMinutes || 30;
    const blocks = mins / 30;
    if (entry.focus === 'deep') totalPoints += blocks * 20;
    else if (entry.focus === 'light') totalPoints += blocks * 10;
    else if (entry.focus === 'off') totalPoints -= blocks * 10;
  }
  let baseScore = Math.max(0, Math.min(100, totalPoints));
  const lastEntry = sorted[sorted.length - 1];
  const lastEntryDate = new Date(lastEntry.createdAt);
  
  if (getDateKey(lastEntryDate) === getDateKey(referenceDate)) {
    const hoursSinceLastLog = (Date.now() - lastEntryDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastLog > 1.5) {
      const penalty = (hoursSinceLastLog - 1.5) * 8;
      baseScore = Math.max(0, baseScore - penalty);
    }
  }
  return Math.round(baseScore);
}

function old_stats_tsx_tagMinutes(targetEntries) {
    const bd = {};
    for (const e of targetEntries) {
      if (!e.tags) continue;
      for (const tag of e.tags) {
        bd[tag] = (bd[tag] ?? 0) + (e.intervalMinutes || 0);
      }
    }
    return Object.entries(bd).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function new_aggregateTagMinutes(entries) {
  const bd = {};
  for (const e of entries) {
    if (!e.tags || !Array.isArray(e.tags)) continue;
    for (const tag of e.tags) {
      bd[tag] = (bd[tag] || 0) + (e.intervalMinutes || 0);
    }
  }
  return Object.entries(bd).sort((a, b) => b[1] - a[1]);
}

// ------------------------------------------------------------------
// DATASETS & EXECUTION
// ------------------------------------------------------------------
const now = new Date();
const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));

const dataset = [
  { id: '1', createdAt: threeHoursAgo.toISOString(), focus: 'deep', intervalMinutes: 60, tags: ['coding', 'work'] },
  { id: '2', createdAt: twoHoursAgo.toISOString(), focus: 'light', intervalMinutes: 30, tags: ['work', 'email'] },
  { id: '3', createdAt: new Date(Date.now() - (1 * 60 * 60 * 1000)).toISOString(), focus: 'off', intervalMinutes: 30, tags: ['social'] }
];

// Test 1: Focus Score
const oldScore = old_getFocusScore(dataset);
const newScore = new_calculateFocusScore(dataset, new Date());
console.log(JSON.stringify({ test: "Focus Score", old: oldScore, new: newScore }));

// Test 2: Tag Breakdown
const oldTags = old_stats_tsx_tagMinutes(dataset);
const newTags = new_aggregateTagMinutes(dataset).slice(0, 8);
console.log(JSON.stringify({ test: "Tag Minutes", old: oldTags, new: newTags }));

// Test 3: Null/Invalid Data Handling
const invalidDataset = [
  { id: '4', createdAt: now.toISOString(), focus: 'deep', tags: null, intervalMinutes: null }
];

let oldTagsInvalid;
try {
  oldTagsInvalid = old_stats_tsx_tagMinutes(invalidDataset);
} catch(e) {
  oldTagsInvalid = "CRASH";
}

let newTagsInvalid;
try {
  newTagsInvalid = new_aggregateTagMinutes(invalidDataset).slice(0, 8);
} catch(e) {
  newTagsInvalid = "CRASH";
}
console.log(JSON.stringify({ test: "Tag Minutes (Invalid Data)", old: oldTagsInvalid, new: newTagsInvalid }));
