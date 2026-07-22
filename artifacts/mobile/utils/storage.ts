import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, DaySummary, Settings } from '@/types';

const KEYS = {
  ENTRIES: 'atlas_entries',
  SETTINGS: 'atlas_settings',
  DAY_SUMMARIES: 'atlas_day_summaries',
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
