import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, DaySummary, Settings, Domain, Activity } from '@/types';

const KEYS = {
  ENTRIES: 'atlas_entries',
  SETTINGS: 'atlas_settings',
  DAY_SUMMARIES: 'atlas_day_summaries',
  CUSTOM_TAGS: 'atlas_custom_tags',
  DOMAINS: 'atlas_domains',
  ACTIVITIES: 'atlas_activities',
};

export const DEFAULT_SETTINGS: Settings = {
  interval: 30,
  activeStart: 7,
  activeEnd: 23,
  dayStartHour: 4,
  notificationsEnabled: true,
};

export async function getAllEntries(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(KEYS.ENTRIES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveEntry(entry: Entry): Promise<void> {
  const entries = await getAllEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  await AsyncStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await getAllEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx >= 0) {
    entries[idx] = {
      ...entries[idx],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  }
}

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getAllDaySummaries(): Promise<DaySummary[]> {
  const raw = await AsyncStorage.getItem(KEYS.DAY_SUMMARIES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveDaySummary(summary: DaySummary): Promise<void> {
  const all = await getAllDaySummaries();
  const idx = all.findIndex(s => s.dateKey === summary.dateKey);
  if (idx >= 0) {
    all[idx] = summary;
  } else {
    all.push(summary);
  }
  await AsyncStorage.setItem(KEYS.DAY_SUMMARIES, JSON.stringify(all));
}

export async function getCustomTags(): Promise<any[] | null> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOM_TAGS);
  return raw ? JSON.parse(raw) : null; // null means "use defaults"
}

export async function saveCustomTags(tags: any[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CUSTOM_TAGS, JSON.stringify(tags));
}

// ── Domains & Activities ───────────────────────────────────────────────────

export const DEFAULT_DOMAINS: Domain[] = [
  { id: 'd-business', name: 'Business', icon: 'briefcase', color: '#3B82F6', position: 0 },
  { id: 'd-learning', name: 'Learning', icon: 'book-open', color: '#8B5CF6', position: 1 },
  { id: 'd-personal', name: 'Personal', icon: 'user', color: '#10B981', position: 2 },
  { id: 'd-life', name: 'Life', icon: 'home', color: '#F59E0B', position: 3 },
];

export const DEFAULT_ACTIVITIES: Activity[] = [
  { id: 'a-b1', domainId: 'd-business', name: 'Video Editing', icon: 'video', position: 0 },
  { id: 'a-b2', domainId: 'd-business', name: 'Coding', icon: 'code', position: 1 },
  { id: 'a-b3', domainId: 'd-business', name: 'Sales', icon: 'dollar-sign', position: 2 },
  { id: 'a-b4', domainId: 'd-business', name: 'Marketing', icon: 'trending-up', position: 3 },
  { id: 'a-b5', domainId: 'd-business', name: 'Meetings', icon: 'users', position: 4 },
  { id: 'a-l1', domainId: 'd-learning', name: 'Reading', icon: 'book', position: 0 },
  { id: 'a-l2', domainId: 'd-learning', name: 'Practice', icon: 'pen-tool', position: 1 },
  { id: 'a-l3', domainId: 'd-learning', name: 'Course', icon: 'monitor', position: 2 },
  { id: 'a-p1', domainId: 'd-personal', name: 'Exercise', icon: 'activity', position: 0 },
  { id: 'a-p2', domainId: 'd-personal', name: 'Meditation', icon: 'wind', position: 1 },
  { id: 'a-life1', domainId: 'd-life', name: 'Meal', icon: 'coffee', position: 0 },
  { id: 'a-life2', domainId: 'd-life', name: 'Sleep', icon: 'moon', position: 1 },
  { id: 'a-life3', domainId: 'd-life', name: 'Commute', icon: 'navigation', position: 2 },
];

export async function getDomains(): Promise<Domain[]> {
  const raw = await AsyncStorage.getItem(KEYS.DOMAINS);
  return raw ? JSON.parse(raw) : DEFAULT_DOMAINS;
}

export async function saveDomains(domains: Domain[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DOMAINS, JSON.stringify(domains));
}

export async function getActivities(): Promise<Activity[]> {
  const raw = await AsyncStorage.getItem(KEYS.ACTIVITIES);
  return raw ? JSON.parse(raw) : DEFAULT_ACTIVITIES;
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
}

// ── Check-in Draft (survives app kill by OS on low-RAM devices) ───────────────
const DRAFT_KEY = 'atlas_checkin_draft';

export interface CheckinDraft {
  text: string;
  selectedTags?: string[];
  domainId?: string;
  activityId?: string;
  focus: string;
  energy: string;
  leverage?: 'high' | 'busywork';
  customDuration?: number;
  taskId?: string;
  taskTitle?: string;
  imageUrl?: string; // local URI or already-uploaded URL
  savedAt: number;   // timestamp — drafts older than 2h are ignored
}

export async function saveCheckinDraft(draft: Omit<CheckinDraft, 'savedAt'>): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {}
}

export async function loadCheckinDraft(): Promise<CheckinDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft: CheckinDraft = JSON.parse(raw);
    // Discard drafts older than 2 hours — they are stale
    if (Date.now() - draft.savedAt > 2 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export async function clearCheckinDraft(): Promise<void> {
  try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
}
