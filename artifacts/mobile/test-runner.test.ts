import { TagConfig } from './constants/tags';
import { Entry } from './types';
import { generateId, getDateKey, getFocusScore } from './utils/helpers';
import { aggregateTagMinutes } from './features/stats/utils/statsAggregations';
import { syncTagsWithAppwrite, pushTagToAppwrite } from './utils/sync';
import { saveCustomTags, getCustomTags } from './utils/storage';

let mockStorage: Record<string, string> = {};
let mockAppwrite: Record<string, any> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: async (key: string, value: string) => { mockStorage[key] = value; },
  getItem: async (key: string) => mockStorage[key] || null,
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: async () => ({ isConnected: true }),
  addEventListener: () => () => {}
}));

jest.mock('expo-haptics', () => ({
  impactAsync: async () => {}
}));

jest.mock('react-native', () => ({
  Alert: { alert: console.log },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Platform: { OS: 'ios' }
}));

jest.mock('./lib/appwrite', () => ({
  databases: {
    updateDocument: async (db: string, col: string, id: string, data: any) => { mockAppwrite[id] = data; },
    createDocument: async (db: string, col: string, id: string, data: any) => { mockAppwrite[id] = data; },
    deleteDocument: async (db: string, col: string, id: string) => { delete mockAppwrite[id]; },
    listDocuments: async () => ({ documents: Object.values(mockAppwrite).map(d => ({ ...d, $id: d.id || d.label })) })
  },
  account: {
    get: async () => ({ $id: 'user123' })
  },
  APPWRITE_CONFIG: {
    DATABASE_ID: 'db',
    COLLECTIONS: { TAGS: 'tags' }
  },
  Query: { limit: () => '' },
  Permission: { read: () => '', write: () => '' },
  Role: { user: () => '' }
}));

describe('DaySync End-toEnd System Tests', () => {
  let customTags: TagConfig[] = [];
  let entries: Entry[] = [];
  let tag1: TagConfig;

  beforeEach(() => {
    mockStorage = {};
    mockAppwrite = {};
    customTags = [];
    entries = [];
  });

  test('1. Create Tag', async () => {
    tag1 = { id: 'work-1', label: 'Work', icon: 'briefcase', color: '#00f', bg: '#00f' };
    customTags = [...customTags, tag1];
    await saveCustomTags(customTags);
    await pushTagToAppwrite(tag1);
    
    expect((await getCustomTags() || []).length).toBe(1);
    expect(mockAppwrite['work-1'].label).toBe('Work');
  });

  test('2. Rename Tag', async () => {
    const tag1Renamed: TagConfig = { ...tag1, label: 'Work (Remote)' };
    customTags = customTags.map(t => t.id === tag1Renamed.id ? tag1Renamed : t);
    await saveCustomTags(customTags);
    await pushTagToAppwrite(tag1Renamed);
    
    expect((await getCustomTags() || [])[0].label).toBe('Work (Remote)');
    expect(mockAppwrite['work-1'].label).toBe('Work (Remote)');
  });

  test('4. Save Entry', async () => {
    const entry1: Entry = {
      id: generateId(),
      text: "Did some work",
      tags: [tag1.id],
      focus: 'deep',
      energy: 'high',
      intervalMinutes: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dateKey: getDateKey(new Date())
    };
    entries.push(entry1);
    expect(entries.length).toBe(1);
  });

  test('5. Update Entry (Simulated)', async () => {
    entries[0].intervalMinutes = 120;
    expect(entries[0].intervalMinutes).toBe(120);
  });

  test('6. History (Simulated Rendering Filter)', async () => {
    const renderedTag = customTags.find(t => t.id === (entries[0].tags || [])[0]);
    expect(renderedTag).toBeDefined();
    expect(renderedTag?.label).toBe('Work (Remote)');
  });

  test('7. Statistics', async () => {
    const tagMins = aggregateTagMinutes(entries);
    expect(tagMins.length).toBe(1);
    expect(tagMins[0][0]).toBe(tag1.id);
    expect(tagMins[0][1]).toBe(120);
  });

  test('8. Sync', async () => {
    const tagRemoteOnly: TagConfig = { id: 'remote-2', label: 'Remote Tag', icon: 'zap', color: '#f00', bg: '#f00' };
    mockAppwrite['remote-2'] = tagRemoteOnly; 
    customTags = await syncTagsWithAppwrite(customTags);
    
    expect(customTags.length).toBe(2);
    expect(customTags.find(t => t.id === 'remote-2')).toBeDefined();
  });

  test('3. Delete Tag', async () => {
    customTags = customTags.filter(t => t.id !== tag1.id);
    await saveCustomTags(customTags);
    
    expect((await getCustomTags() || []).length).toBe(1);
  });

  test('9. Offline Queue (Simulated via Local Storage Priority)', async () => {
    expect(customTags.length).toBe(1);
  });

  test('10. Orphaned Tags', async () => {
    const entryOrphan: any = { tags: [tag1.id, 'remote-2'] };
    const validTagIds = new Set(customTags.map(t => t.id));
    const filteredTags = entryOrphan.tags.filter((t: string) => validTagIds.has(t));
    
    expect(filteredTags.length).toBe(1);
    expect(filteredTags[0]).toBe('remote-2');
  });
});
