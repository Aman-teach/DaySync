import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Entry, DaySummary, Settings, AtlasTask, Domain, Activity } from '@/types';
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
  getDomains,
  saveDomains,
  getActivities,
  saveActivities,
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
  syncDaySummariesWithAppwrite,
  pushDaySummaryToAppwrite,
  syncTagsWithAppwrite,
  pushTagToAppwrite,
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
  domains: Domain[];
  activities: Activity[];
  addDomain: (domain: Domain) => Promise<void>;
  updateDomain: (domain: Domain) => Promise<void>;
  removeDomain: (id: string) => Promise<void>;
  addActivity: (activity: Activity) => Promise<void>;
  updateActivity: (activity: Activity) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  addEntry: (
    data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'dateKey'>
  ) => Promise<string>;
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
  const [domains, setDomains] = useState<Domain[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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
    const [allEntries, allSettings, allSummaries, storedTags, storedDomains, storedActivities] = await Promise.all([
      getAllEntries(),
      getSettings(),
      getAllDaySummaries(),
      getCustomTags(),
      getDomains(),
      getActivities(),
    ]);
    setEntries(allEntries);
    setSettings(allSettings);
    setDaySummaries(allSummaries);
    if (storedTags !== null) setCustomTags(storedTags);
    setDomains(storedDomains);
    setActivities(storedActivities);
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
    syncTagsWithAppwrite(storedTags ?? TAGS).then(syncedTags => {
      setCustomTags(syncedTags);
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
        syncTagsWithAppwrite(customTags ?? TAGS).then(syncedTags => {
          if (JSON.stringify(customTags ?? TAGS) !== JSON.stringify(syncedTags)) {
            setCustomTags(syncedTags);
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [entries, daySummaries, customTags]);

  const activeEntriesForToday = React.useMemo(() => entries.filter(e => !e.isDeleted), [entries]);
  const todayEntries = getTodayEntries(activeEntriesForToday, settings.dayStartHour);
  const focusScore = getFocusScore(todayEntries);

  const addEntry = useCallback(
    async (data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'dateKey'>) => {
      const now = new Date().toISOString();
      const validTagIds = new Set((customTags ?? TAGS).map(t => t.id));
      const filteredTags = data.tags ? data.tags.filter(tagId => validTagIds.has(tagId)) : [];
      
      const entry: Entry = {
        ...data,
        tags: filteredTags,
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
      
      return entry.id;
    },
    [settings, customTags]
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<Entry>) => {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      
      const validTagIds = new Set((customTags ?? TAGS).map(t => t.id));
      const updatedTags = updates.tags !== undefined 
        ? updates.tags.filter(tagId => validTagIds.has(tagId))
        : entry.tags;

      const updated: Entry = {
        ...entry,
        ...updates,
        tags: updatedTags,
        updatedAt: new Date().toISOString(),
      };
      await storeSaveEntry(updated);
      setEntries(prev => prev.map(e => (e.id === id ? updated : e)));

      // Async push to Appwrite
      pushEntryToAppwrite(updated);
    },
    [entries, customTags]
  );

  const removeEntry = useCallback(async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const deletedEntry = { ...entry, isDeleted: true, updatedAt: new Date().toISOString() };
    await storeSaveEntry(deletedEntry);
    setEntries(prev => prev.map(e => e.id === id ? deletedEntry : e));
    pushEntryToAppwrite(deletedEntry);
  }, [entries]);

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
      const dayEntries = entries.filter(e => e.dateKey === key && !e.isDeleted);
      if (dayEntries.length === 0) return null;

      try {
        const entryLines = dayEntries.map(e => {
          const time = new Date(e.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `${time} [${e.focus}/${e.energy}] [${(e.tags || []).join(', ')}]: ${e.text || '(no note)'}`;
        });

        const tagTotals: Record<string, number> = {};
        for (const e of dayEntries) {
          for (const tag of (e.tags || [])) {
            tagTotals[tag] = (tagTotals[tag] ?? 0) + e.intervalMinutes;
          }
        }

        const yesterdayDate = new Date(key);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayKey = getDateKey(yesterdayDate, settings.dayStartHour);
        const yesterdaySummary = daySummaries.find(s => s.dateKey === yesterdayKey);

        const systemPrompt = `You are Aman's blunt personal coach. You read his daily logs and give him a straight-talking breakdown — no corporate speak, no PhD vocabulary, no filler phrases.

How you write:
- Short sentences. Vary the length. Don't write walls of text.
- Call things what they are. A 4-hour gap is a 4-hour gap, not "underutilization of temporal resources".
- First person is fine. Opinions are fine. Be direct.
- No "it's worth noting", "significant", "pivotal", "vibrant", "nestled", "groundbreaking".
- No em dashes overuse. No rule of three. No generic conclusions.
- If he screwed up, say so clearly. If he did well, say so without exaggerating.
- Tomorrow's advice must be specific to TODAY's actual data — not generic productivity tips. Reference the actual times, domains, and gaps you saw.

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

        let userPrompt = `Aman's logs for ${key}:\n\n${entryLines.join('\n')}\n\nTime per tag (minutes): ${JSON.stringify(tagTotals)}\n\n`;
        if (yesterdaySummary) {
          userPrompt += `Yesterday (${yesterdayKey}) his coach said: "${yesterdaySummary.summary}"\n\n`;
        }
        userPrompt += `Now analyze today. Return this exact JSON:\n{\n  "summary": "2-3 sentences. Plain English. Specific to what he actually did today — mention real times, real gaps, real domains. Compare to yesterday if you have it. Don't sugarcoat but don't be theatrical either.",\n  "highlights": ["Real wins only. Specific. E.g. '2 hours of solid video editing without context switching' not 'good focus'"],\n  "tagBreakdown": {"tag_id": minutes_as_number},\n  "focusStreaks": [consecutive_deep_work_block_lengths_as_numbers],\n  "mood": "One sentence on his energy pattern today. Specific, not vague.",\n  "anomalies": ["Real problems. E.g. '3-hour gap between 1pm and 4pm with no log' or 'dropped from deep to distracted after lunch'. Be specific."],\n  "guideAdvice": "Tomorrow's ONE action. Must be specific to what you saw today. If he had a gap at 2pm today, tell him to block 2pm tomorrow for X. Not generic advice.",\n  "tomorrowPlan": ["2-3 specific, time-based actions for tomorrow tied to today's gaps. E.g. 'Log your first session before 6am' or 'No gap longer than 90 min between 9am-6pm'"]
}`;

        const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";
        const modelsToTry = [
          "llama-3",
          "gpt-4o"
        ];

        let data = null;
        let lastError = null;
        let rawContent = "";

        for (const modelId of modelsToTry) {
          try {
            const response = await fetch("https://mini-omniroute.atlas-omniroute.workers.dev", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
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
    pushTagToAppwrite(tag);
  }, [customTags]);

  const removeTag = useCallback(async (id: string) => {
    const targetTag = (customTags ?? TAGS).find(t => t.id === id);
    if (!targetTag) return;
    const deletedTag = { ...targetTag, isDeleted: true };
    const next = (customTags ?? TAGS).map(t => t.id === id ? deletedTag : t);
    setCustomTags(next);
    await saveCustomTags(next);
    pushTagToAppwrite(deletedTag);
  }, [customTags]);

  const updateTag = useCallback(async (tag: TagConfig) => {
    const next = (customTags ?? TAGS).map(t => t.id === tag.id ? tag : t);
    setCustomTags(next);
    await saveCustomTags(next);
    pushTagToAppwrite(tag);
  }, [customTags]);

  const activeTags = React.useMemo(() => tags.filter(t => !t.isDeleted), [tags]);
  const activeEntries = React.useMemo(() => entries.filter(e => !e.isDeleted), [entries]);
  const activeSummaries = React.useMemo(() => daySummaries.filter(s => !s.isDeleted), [daySummaries]);

  const addDomain = useCallback(async (domain: Domain) => {
    const next = [...domains, domain];
    setDomains(next);
    await saveDomains(next);
  }, [domains]);

  const updateDomain = useCallback(async (domain: Domain) => {
    const next = domains.map(d => d.id === domain.id ? domain : d);
    setDomains(next);
    await saveDomains(next);
  }, [domains]);

  const removeDomain = useCallback(async (id: string) => {
    const next = domains.filter(d => d.id !== id);
    setDomains(next);
    await saveDomains(next);
  }, [domains]);

  const addActivity = useCallback(async (activity: Activity) => {
    const next = [...activities, activity];
    setActivities(next);
    await saveActivities(next);
  }, [activities]);

  const updateActivity = useCallback(async (activity: Activity) => {
    const next = activities.map(a => a.id === activity.id ? activity : a);
    setActivities(next);
    await saveActivities(next);
  }, [activities]);

  const removeActivity = useCallback(async (id: string) => {
    const next = activities.filter(a => a.id !== id);
    setActivities(next);
    await saveActivities(next);
  }, [activities]);

  return (
    <AppContext.Provider
      value={{
        entries: activeEntries,
        settings,
        daySummaries: activeSummaries,
        todayEntries,
        focusScore,
        isLoading,
        lastFocus,
        tags: activeTags,
        tasks,
        domains,
        activities,
        addDomain,
        updateDomain,
        removeDomain,
        addActivity,
        updateActivity,
        removeActivity,
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
