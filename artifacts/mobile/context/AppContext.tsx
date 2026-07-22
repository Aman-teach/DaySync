import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Entry, DaySummary, Settings } from '@/types';
import {
  getAllEntries,
  saveEntry as storeSaveEntry,
  deleteEntry as storeDeleteEntry,
  getSettings,
  saveSettings as storeSaveSettings,
  getAllDaySummaries,
  saveDaySummary,
  DEFAULT_SETTINGS,
} from '@/utils/storage';
import {
  getDateKey,
  generateId,
  getFocusScore,
  getTodayEntries,
} from '@/utils/helpers';
import { scheduleReminders, cancelAllReminders } from '@/utils/notifications';

interface AppContextType {
  entries: Entry[];
  settings: Settings;
  daySummaries: DaySummary[];
  todayEntries: Entry[];
  focusScore: number;
  isLoading: boolean;
  lastFocus: { focus: Entry['focus']; energy: Entry['energy'] };
  addEntry: (
    data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'dateKey'>
  ) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  generateDayWrap: (dateKey?: string) => Promise<DaySummary | null>;
  reload: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFocus, setLastFocus] = useState<{
    focus: Entry['focus'];
    energy: Entry['energy'];
  }>({ focus: 'deep', energy: 'high' });

  const reload = useCallback(async () => {
    const [allEntries, allSettings, allSummaries] = await Promise.all([
      getAllEntries(),
      getSettings(),
      getAllDaySummaries(),
    ]);
    setEntries(allEntries);
    setSettings(allSettings);
    setDaySummaries(allSummaries);
    if (allEntries.length > 0) {
      const sorted = [...allEntries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setLastFocus({ focus: sorted[0].focus, energy: sorted[0].energy });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const todayEntries = getTodayEntries(entries, settings.dayStartHour);
  const focusScore = getFocusScore(todayEntries);

  const addEntry = useCallback(
    async (data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'dateKey'>) => {
      const now = new Date().toISOString();
      const entry: Entry = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        dateKey: getDateKey(new Date(), settings.dayStartHour),
      };
      await storeSaveEntry(entry);
      setEntries(prev => [...prev, entry]);
      setLastFocus({ focus: entry.focus, energy: entry.energy });
    },
    [settings.dayStartHour]
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<Entry>) => {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      const updated: Entry = {
        ...entry,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await storeSaveEntry(updated);
      setEntries(prev => prev.map(e => (e.id === id ? updated : e)));
    },
    [entries]
  );

  const removeEntry = useCallback(async (id: string) => {
    await storeDeleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const newSettings = { ...settings, ...updates } as Settings;
      await storeSaveSettings(newSettings);
      setSettings(newSettings);
      if (newSettings.notificationsEnabled) {
        await scheduleReminders(newSettings);
      } else {
        await cancelAllReminders();
      }
    },
    [settings]
  );

  const generateDayWrap = useCallback(
    async (dateKey?: string): Promise<DaySummary | null> => {
      const key = dateKey ?? getDateKey(new Date(), settings.dayStartHour);
      const dayEntries = entries.filter(e => e.dateKey === key);
      if (dayEntries.length === 0) return null;

      try {
        const response = await fetch(
          `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/day-wrap`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: dayEntries, dateKey: key }),
          }
        );
        if (!response.ok) return null;
        const data = await response.json();
        const summary: DaySummary = {
          id: generateId(),
          dateKey: key,
          summary: data.summary ?? '',
          highlights: data.highlights ?? [],
          tagBreakdown: data.tagBreakdown ?? {},
          focusStreaks: data.focusStreaks ?? [],
          mood: data.mood ?? '',
          anomalies: data.anomalies ?? [],
          createdAt: new Date().toISOString(),
        };
        await saveDaySummary(summary);
        setDaySummaries(prev => {
          const idx = prev.findIndex(s => s.dateKey === key);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = summary;
            return next;
          }
          return [...prev, summary];
        });
        return summary;
      } catch {
        return null;
      }
    },
    [entries, settings.dayStartHour]
  );

  return (
    <AppContext.Provider
      value={{
        entries,
        settings,
        daySummaries,
        todayEntries,
        focusScore,
        isLoading,
        lastFocus,
        addEntry,
        updateEntry,
        removeEntry,
        updateSettings,
        generateDayWrap,
        reload,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
