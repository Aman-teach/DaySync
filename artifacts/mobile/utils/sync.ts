import { databases, APPWRITE_CONFIG, Query, account, Permission, Role } from '@/lib/appwrite';
import { Entry, DaySummary } from '@/types';
import { getAllEntries, saveEntry, deleteEntry as storeDeleteEntry, getAllDaySummaries, saveDaySummary, saveCustomTags } from './storage';
import { TagConfig } from '@/constants/tags';

/**
 * Format entry for Appwrite document storage.
 * Includes explicit fields as well as a fallback JSON payload for maximum compatibility.
 */
function entryToDocument(entry: Entry, userId: string) {
  return {
    text: entry.text,
    tags: entry.tags,
    focus: entry.focus,
    energy: entry.energy,
    domainId: entry.domainId || null,
    activityId: entry.activityId || null,
    duration: entry.duration || entry.intervalMinutes || 30,
    intervalMinutes: entry.intervalMinutes || entry.duration || 30,
    taskId: entry.taskId || null,
    taskTitle: entry.taskTitle || null,
    imageUrl: entry.imageUrl || null,
    leverage: entry.leverage || null,
    dateKey: entry.dateKey,
    userId: userId,
    isDeleted: entry.isDeleted || false,
  };
}

function documentToEntry(doc: any): Entry {
  return {
    id: doc.$id || doc.id,
    text: doc.text || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    focus: doc.focus || 'deep',
    energy: doc.energy || 'high',
    domainId: doc.domainId || undefined,
    activityId: doc.activityId || undefined,
    duration: doc.duration || doc.intervalMinutes || 30,
    taskId: doc.taskId || undefined,
    taskTitle: doc.taskTitle || undefined,
    imageUrl: doc.imageUrl || undefined,
    leverage: doc.leverage || undefined,
    createdAt: doc.$createdAt || doc.createdAt || new Date().toISOString(),
    updatedAt: doc.$updatedAt || doc.updatedAt || doc.$createdAt || new Date().toISOString(),
    intervalMinutes: doc.intervalMinutes || doc.duration || 30,
    dateKey: doc.dateKey || '',
    isDeleted: doc.isDeleted || false,
  };
}

/**
 * Format day summary for Appwrite document storage.
 */
function summaryToDocument(summary: DaySummary, userId: string) {
  return {
    dateKey: summary.dateKey,
    summary: summary.summary,
    highlights: summary.highlights,
    tagBreakdown: JSON.stringify(summary.tagBreakdown),
    focusStreaks: summary.focusStreaks,
    mood: summary.mood,
    anomalies: summary.anomalies,
    userId: userId,
    isDeleted: summary.isDeleted || false,
  };
}

function documentToSummary(doc: any): DaySummary {
  let tagBreakdown = {};
  if (typeof doc.tagBreakdown === 'string') {
    try { tagBreakdown = JSON.parse(doc.tagBreakdown); } catch {}
  } else if (doc.tagBreakdown) {
    tagBreakdown = doc.tagBreakdown;
  }
  return {
    id: doc.$id || doc.id,
    dateKey: doc.dateKey || '',
    summary: doc.summary || '',
    highlights: Array.isArray(doc.highlights) ? doc.highlights : [],
    tagBreakdown,
    focusStreaks: Array.isArray(doc.focusStreaks) ? doc.focusStreaks : [],
    mood: doc.mood || '',
    anomalies: Array.isArray(doc.anomalies) ? doc.anomalies : [],
    createdAt: doc.$createdAt || doc.createdAt || new Date().toISOString(),
    isDeleted: doc.isDeleted || false,
  };
}

/**
 * Push an entry to Appwrite asynchronously.
 */
export async function pushEntryToAppwrite(entry: Entry): Promise<void> {
  try {
    const user = await account.get();
    const data = entryToDocument(entry, user.$id);
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.ENTRIES,
        entry.id,
        data
      );
    } catch {
      // Document might not exist yet, try creating it with the entry's ID
      await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.ENTRIES,
        entry.id,
        data,
        [
          Permission.read(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
        ]
      );
    }
  } catch (err: any) {
    // Offline or schema mismatch — silently log so local storage remains functional
    console.log('[Appwrite Sync] pushEntry failed (offline/fallback):', err?.message ?? err);
  }
}



/**
 * Synchronize all entries between local storage (AsyncStorage) and Appwrite.
 */
export async function syncEntriesWithAppwrite(localEntries: Entry[]): Promise<Entry[]> {
  try {
    let remoteDocs: any[] = [];
    let lastId: string | null = null;
    let hasMore = true;
    while (hasMore) {
      const queries = [Query.limit(500)];
      if (lastId) queries.push(Query.cursorAfter(lastId));
      
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.ENTRIES,
        queries
      );
      
      remoteDocs = remoteDocs.concat(response.documents);
      if (response.documents.length < 500) {
        hasMore = false;
      } else {
        lastId = response.documents[response.documents.length - 1].$id;
      }
    }
    const remoteEntriesMap = new Map<string, Entry>();

    for (const doc of remoteDocs) {
      const entry = documentToEntry(doc);
      remoteEntriesMap.set(entry.id, entry);
    }

    const mergedEntriesMap = new Map<string, Entry>();

    // Add all local entries
    for (const entry of localEntries) {
      mergedEntriesMap.set(entry.id, entry);
    }

    // Merge remote entries (newer updatedAt wins)
    for (const [id, remoteEntry] of remoteEntriesMap.entries()) {
      const localEntry = mergedEntriesMap.get(id);
      if (!localEntry) {
        mergedEntriesMap.set(id, remoteEntry);
        await saveEntry(remoteEntry);
      } else {
        const localTime = new Date(localEntry.updatedAt).getTime();
        const remoteTime = new Date(remoteEntry.updatedAt).getTime();
        if (remoteTime > localTime) {
          mergedEntriesMap.set(id, remoteEntry);
          await saveEntry(remoteEntry);
        } else if (localTime > remoteTime) {
          // Push local newer entry to Appwrite
          pushEntryToAppwrite(localEntry);
        }
      }
    }

    // Push any local entries missing in remote to Appwrite
    for (const [id, localEntry] of mergedEntriesMap.entries()) {
      if (!remoteEntriesMap.has(id)) {
        pushEntryToAppwrite(localEntry);
      }
    }

    return Array.from(mergedEntriesMap.values());
  } catch (err: any) {
    console.log('[Appwrite Sync] syncEntries failed (operating in offline mode):', err?.message ?? err);
    // Return freshest local data from storage — never overwrite what the user just saved
    return getAllEntries();
  }
}

/**
 * Push day summary to Appwrite asynchronously.
 */
export async function pushDaySummaryToAppwrite(summary: DaySummary): Promise<void> {
  try {
    const user = await account.get();
    const data = summaryToDocument(summary, user.$id);
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.DAY_SUMMARIES,
        summary.id,
        data
      );
    } catch {
      await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.DAY_SUMMARIES,
        summary.id,
        data,
        [
          Permission.read(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
        ]
      );
    }
  } catch (err) {
    console.log('[Appwrite Sync] pushDaySummary failed:', err);
  }
}

/**
 * Synchronize day summaries with Appwrite.
 */
export async function syncDaySummariesWithAppwrite(localSummaries: DaySummary[]): Promise<DaySummary[]> {
  try {
    let remoteDocs: any[] = [];
    let lastId: string | null = null;
    let hasMore = true;
    while (hasMore) {
      const queries = [Query.limit(200)];
      if (lastId) queries.push(Query.cursorAfter(lastId));
      
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.DAY_SUMMARIES,
        queries
      );
      
      remoteDocs = remoteDocs.concat(response.documents);
      if (response.documents.length < 200) {
        hasMore = false;
      } else {
        lastId = response.documents[response.documents.length - 1].$id;
      }
    }
    const remoteMap = new Map<string, DaySummary>();

    for (const doc of remoteDocs) {
      const summary = documentToSummary(doc);
      remoteMap.set(summary.dateKey, summary);
    }

    const mergedMap = new Map<string, DaySummary>();
    for (const s of localSummaries) {
      mergedMap.set(s.dateKey, s);
    }

    for (const [dateKey, remoteSummary] of remoteMap.entries()) {
      if (!mergedMap.has(dateKey)) {
        mergedMap.set(dateKey, remoteSummary);
        await saveDaySummary(remoteSummary);
      }
    }

    for (const [dateKey, localSummary] of mergedMap.entries()) {
      if (!remoteMap.has(dateKey)) {
        pushDaySummaryToAppwrite(localSummary);
      }
    }

    return Array.from(mergedMap.values());
  } catch (err) {
    console.log('[Appwrite Sync] syncDaySummaries failed:', err);
    return localSummaries;
  }
}

/**
 * Format tag for Appwrite document storage.
 */
function tagToDocument(tag: TagConfig, userId: string) {
  return {
    label: tag.label,
    icon: tag.icon,
    color: tag.color,
    bg: tag.bg || null,
    userId: userId,
    isDeleted: tag.isDeleted || false,
  };
}

function documentToTag(doc: any): TagConfig {
  return {
    id: doc.$id || doc.id,
    label: doc.label || '',
    icon: doc.icon || 'star',
    color: doc.color || '#444444',
    bg: doc.bg || null,
    isDeleted: doc.isDeleted || false,
  };
}

export async function pushTagToAppwrite(tag: TagConfig): Promise<void> {
  try {
    const user = await account.get();
    const data = tagToDocument(tag, user.$id);
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.TAGS,
        tag.id,
        data
      );
    } catch {
      await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.TAGS,
        tag.id,
        data,
        [
          Permission.read(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
        ]
      );
    }
  } catch (err) {
    console.log('[Appwrite Sync] pushTag failed:', err);
  }
}



export async function syncTagsWithAppwrite(localTags: TagConfig[]): Promise<TagConfig[]> {
  try {
    let remoteDocs: any[] = [];
    let lastId: string | null = null;
    let hasMore = true;
    while (hasMore) {
      const queries = [Query.limit(200)];
      if (lastId) queries.push(Query.cursorAfter(lastId));
      
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.TAGS,
        queries
      );
      
      remoteDocs = remoteDocs.concat(response.documents);
      if (response.documents.length < 200) {
        hasMore = false;
      } else {
        lastId = response.documents[response.documents.length - 1].$id;
      }
    }
    const remoteMap = new Map<string, TagConfig>();

    for (const doc of remoteDocs) {
      const tag = documentToTag(doc);
      remoteMap.set(tag.id, tag);
    }

    const mergedMap = new Map<string, TagConfig>();
    for (const t of localTags) {
      mergedMap.set(t.id, t);
    }

    // Merge strategy: remote tags that don't exist locally are pulled
    // Local tags that don't exist remotely are pushed
    for (const [id, remoteTag] of remoteMap.entries()) {
      if (!mergedMap.has(id)) {
        mergedMap.set(id, remoteTag);
      }
    }

    for (const [id, localTag] of mergedMap.entries()) {
      if (!remoteMap.has(id)) {
        pushTagToAppwrite(localTag);
      }
    }

    const finalTags = Array.from(mergedMap.values());
    await saveCustomTags(finalTags);
    return finalTags;
  } catch (err) {
    console.log('[Appwrite Sync] syncTags failed:', err);
    return localTags;
  }
}
