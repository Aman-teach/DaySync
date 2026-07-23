import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, DaySummary, Settings } from '@/types';

const KEYS = {
  ENTRIES: 'atlas_entries',
  SETTINGS: 'atlas_settings',
  DAY_SUMMARIES: 'atlas_day_summaries',
  CUSTOM_TAGS: 'atlas_custom_tags',
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
  await AsyncStorage.setItem(
    KEYS.ENTRIES,
    JSON.stringify(entries.filter(e => e.id !== id))
  );
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

// ── Check-in Draft (survives app kill by OS on low-RAM devices) ───────────────
const DRAFT_KEY = 'atlas_checkin_draft';

export interface CheckinDraft {
  text: string;
  selectedTags: string[];
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
