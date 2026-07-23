import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Entry, DaySummary, Settings, AtlasTask } from '@/types';
import {
  getAllEntries,
  saveEntry as storeSaveEntry,
  deleteEntry as storeDeleteEntry,
  getSettings,
  saveSettings as storeSaveSettings,
  getAllDaySummaries,
  saveDaySummary,
  DEFAULT_SETTINGS,
  getCustomTags,
  saveCustomTags,
} from '@/utils/storage';
import { TAGS, TagConfig } from '@/constants/tags';
import {
  getDateKey,
  generateId,
  getFocusScore,
  getTodayEntries,
} from '@/utils/helpers';
import { scheduleReminders, cancelAllReminders } from '@/utils/notifications';
import {
  syncEntriesWithAppwrite,
  pushEntryToAppwrite,
  deleteEntryFromAppwrite,
  syncDaySummariesWithAppwrite,
  pushDaySummaryToAppwrite,
} from '@/utils/sync';
import NetInfo from '@react-native-community/netinfo';
import { databases, APPWRITE_CONFIG } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';

interface AppContextType {
  entries: Entry[];
  settings: Settings;
  daySummaries: DaySummary[];
  todayEntries: Entry[];
  focusScore: number;
  isLoading: boolean;
  lastFocus: { focus: Entry['focus']; energy: Entry['energy'] };
  tags: TagConfig[];
  tasks: AtlasTask[];
  addEntry: (
    data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'dateKey'>
  ) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  generateDayWrap: (dateKey?: string) => Promise<DaySummary | null>;
  reload: () => Promise<void>;
  addTag: (tag: TagConfig) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  updateTag: (tag: TagConfig) => Promise<void>;
  fetchTasks: () => Promise<void>;
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
  const [customTags, setCustomTags] = useState<TagConfig[] | null>(null);
  const [tasks, setTasks] = useState<AtlasTask[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.TASKS,
        [Query.limit(50), Query.orderDesc('$createdAt')]
      );
      const mappedTasks = response.documents.map(doc => ({
        id: doc.$id,
        title: doc.title || doc.name || doc.text || doc.task || 'Untitled Task',
        status: doc.status || doc.state || 'open'
      })).filter(t => t.status !== 'done' && t.status !== 'completed');
      setTasks(mappedTasks);
    } catch (e: any) {
      console.log('Failed to fetch AtlasOS tasks. The user might not be logged in or lacks permissions:', e.message);
    }
  }, []);

  const reload = useCallback(async () => {
    const [allEntries, allSettings, allSummaries, storedTags] = await Promise.all([
      getAllEntries(),
      getSettings(),
      getAllDaySummaries(),
      getCustomTags(),
    ]);
    setEntries(allEntries);
    setSettings(allSettings);
    setDaySummaries(allSummaries);
    if (storedTags !== null) setCustomTags(storedTags);
    if (allEntries.length > 0) {
      const sorted = [...allEntries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setLastFocus({ focus: sorted[0].focus, energy: sorted[0].energy });
    }
    
    // Fetch tasks in background
    fetchTasks();

    setIsLoading(false);

    // Background Appwrite sync after local load
    syncEntriesWithAppwrite(allEntries).then(syncedEntries => {
      setEntries(syncedEntries);
    });
    syncDaySummariesWithAppwrite(allSummaries).then(syncedSummaries => {
      setDaySummaries(syncedSummaries);
    });

    // Schedule dynamic notifications on app load
    scheduleReminders(allSettings);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // If we just came online, trigger a background sync of our current data
        syncEntriesWithAppwrite(entries).then(syncedEntries => {
          // Only update state if entries actually changed to avoid unnecessary re-renders
          if (JSON.stringify(entries) !== JSON.stringify(syncedEntries)) {
            setEntries(syncedEntries);
          }
        });
        syncDaySummariesWithAppwrite(daySummaries).then(syncedSummaries => {
          if (JSON.stringify(daySummaries) !== JSON.stringify(syncedSummaries)) {
            setDaySummaries(syncedSummaries);
          }
        });
      }
    });
    return () => unsubscribe();
  }, [entries, daySummaries]);

  // Foreground Sync: When the user unlocks their phone or switches back to the app, automatically pull fresh data
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncEntriesWithAppwrite(entries).then(syncedEntries => {
          if (JSON.stringify(entries) !== JSON.stringify(syncedEntries)) {
            setEntries(syncedEntries);
          }
        });
        syncDaySummariesWithAppwrite(daySummaries).then(syncedSummaries => {
          if (JSON.stringify(daySummaries) !== JSON.stringify(syncedSummaries)) {
            setDaySummaries(syncedSummaries);
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [entries, daySummaries]);

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

      // Async push to Appwrite
      pushEntryToAppwrite(entry);

      // Instantly recalculate and schedule push notifications based on this new entry
      scheduleReminders(settings);
    },
    [settings]
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

      // Async push to Appwrite
      pushEntryToAppwrite(updated);
    },
    [entries]
  );

  const removeEntry = useCallback(async (id: string) => {
    await storeDeleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));

    // Async delete from Appwrite
    deleteEntryFromAppwrite(id);
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const newSettings = { ...settings, ...updates } as Settings;
      // Optimistic UI update
      setSettings(newSettings);
      
      try {
        await storeSaveSettings(newSettings);
        if (newSettings.notificationsEnabled) {
          await scheduleReminders(newSettings);
        } else {
          await cancelAllReminders();
        }
      } catch (err) {
        console.error('Failed to save settings or schedule reminders:', err);
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
        const entryLines = dayEntries.map(e => {
          const time = new Date(e.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `${time} [${e.focus}/${e.energy}] [${e.tags.join(', ')}]: ${e.text || '(no note)'}`;
        });

        const tagTotals: Record<string, number> = {};
        for (const e of dayEntries) {
          for (const tag of e.tags) {
            tagTotals[tag] = (tagTotals[tag] ?? 0) + e.intervalMinutes;
          }
        }

        const yesterdayDate = new Date(key);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayKey = getDateKey(yesterdayDate, settings.dayStartHour);
        const yesterdaySummary = daySummaries.find(s => s.dateKey === yesterdayKey);

        const systemPrompt =
          "You are the user's high-performance execution guide and ruthless accountability mirror. Your job is to analyze their logs and explicitly expose their flaws, excuses, and time-wasting patterns. You must compare their performance today to their performance yesterday. Follow these guidelines strictly:\n" +
          "1. Be brutally honest. If they wasted time or gave up early, call it out directly. Do not sugarcoat failures.\n" +
          "2. Compare today's execution against yesterday's summary. Did they improve, or did they backslide?\n" +
          "3. Focus on concrete execution patterns, productivity leaks, and actionable coaching directives. Avoid sycophancy or fake motivation.";

        let userPrompt = `Here is the daily check-in log for today (${key}):\n\n${entryLines.join('\n')}\n\nTag totals (minutes): ${JSON.stringify(tagTotals)}\n\n`;
        if (yesterdaySummary) {
          userPrompt += `For comparison, here is your assessment of their performance YESTERDAY (${yesterdayKey}):\n"${yesterdaySummary.summary}"\n\n`;
        }
        
        userPrompt += `Analyze today's data against yesterday (if provided) and return a JSON object with exactly these fields:\n{\n  "summary": "Ruthless, specific assessment of how they managed their time today and how it compares to yesterday (2-3 sentences). Expose their flaws.",\n  "highlights": ["1-2 concrete wins/focus accomplishments (only if they actually earned it)"],\n  "tagBreakdown": {"tag_id": minutes_number},\n  "focusStreaks": [consecutive_deep_blocks_as_numbers],\n  "mood": "Brief summary of their energy patterns",\n  "anomalies": ["notable gaps, context switches, toxic habits, or distractions observed"],\n  "guideAdvice": "One highly actionable, ruthless piece of advice for tomorrow to fix their leaks (1 sentence)"\n}`;

        const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";
        const modelsToTry = [
          "google/gemma-4-31b-it:free",
          "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          "openrouter/free"
        ];

        let data = null;
        let lastError = null;
        let rawContent = "";

        for (const modelId of modelsToTry) {
          try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://expo.dev",
                "X-Title": "DaySync"
              },
              body: JSON.stringify({
                model: modelId,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                max_tokens: 1024,
              }),
            });

            if (!response.ok) {
              throw new Error("API Error: " + response.status + " " + await response.text());
            }

            const resData = await response.json();
            rawContent = resData.choices?.[0]?.message?.content ?? "{}";
            
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("No JSON found in response");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.summary) {
              throw new Error("Missing required summary field in JSON");
            }

            data = parsed;
            break; // Success! Exit loop.
          } catch (err) {
            console.error(`Model ${modelId} failed:`, err);
            lastError = err;
          }
        }

        if (!data) {
          throw new Error("All free models failed. Last error: " + String(lastError));
        }

        const summary: DaySummary = {
          id: generateId(),
          dateKey: key,
          summary: data.summary ?? '',
          highlights: data.highlights ?? [],
          tagBreakdown: data.tagBreakdown ?? {},
          focusStreaks: data.focusStreaks ?? [],
          mood: data.mood ?? '',
          anomalies: data.anomalies ?? [],
          guideAdvice: data.guideAdvice ?? '',
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

        // Async push to Appwrite
        pushDaySummaryToAppwrite(summary);
        return summary;
      } catch (err) {
        console.error("DayWrap generation failed:", err);
        throw err;
      }
    },
    [entries, settings.dayStartHour]
  );

  const tags = customTags ?? TAGS;

  const addTag = useCallback(async (tag: TagConfig) => {
    const next = [...(customTags ?? TAGS), tag];
    setCustomTags(next);
    await saveCustomTags(next);
  }, [customTags]);

  const removeTag = useCallback(async (id: string) => {
    const next = (customTags ?? TAGS).filter(t => t.id !== id);
    setCustomTags(next);
    await saveCustomTags(next);
  }, [customTags]);

  const updateTag = useCallback(async (tag: TagConfig) => {
    const next = (customTags ?? TAGS).map(t => t.id === tag.id ? tag : t);
    setCustomTags(next);
    await saveCustomTags(next);
  }, [customTags]);

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
        tags,
        tasks,
        addEntry,
        updateEntry,
        removeEntry,
        updateSettings,
        generateDayWrap,
        reload,
        addTag,
        removeTag,
        updateTag,
        fetchTasks,
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
