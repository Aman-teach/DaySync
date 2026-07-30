import { Feather } from '@expo/vector-icons';

export interface TagConfig {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
  isDeleted?: boolean;
}

export const TAGS: TagConfig[] = [
  { id: 'deep-work', label: 'Deep Work', icon: 'zap', color: '#1B4332', bg: '#B7E4C7' },
  { id: 'work',      label: 'Work',      icon: 'briefcase', color: '#1A5276', bg: '#D6EAF8' },
  { id: 'meeting',   label: 'Meeting',   icon: 'users', color: '#6C3483', bg: '#E8DAEF' },
  { id: 'exercise',  label: 'Exercise',  icon: 'activity', color: '#7D6608', bg: '#FEF3C7' },
  { id: 'break',     label: 'Break',     icon: 'coffee', color: '#0E6655', bg: '#D1F2EB' },
  { id: 'social',    label: 'Social',    icon: 'message-circle', color: '#922B21', bg: '#FADBD8' },
  { id: 'admin',     label: 'Admin',     icon: 'clipboard', color: '#5D4037', bg: '#EFEBE9' },
  { id: 'learning',  label: 'Learning',  icon: 'book-open', color: '#1A5276', bg: '#D4E6F1' },
  { id: 'reading',   label: 'Reading',   icon: 'book', color: '#4A235A', bg: '#F5EEF8' },
  { id: 'writing',   label: 'Writing',   icon: 'edit-2',  color: '#784212', bg: '#FDF2E9' },
  { id: 'planning',  label: 'Planning',  icon: 'calendar',  color: '#154360', bg: '#D6EAF8' },
  { id: 'personal',  label: 'Personal',  icon: 'heart', color: '#7B241C', bg: '#FDEDEC' },
];

export const getTag = (id: string): TagConfig | undefined =>
  TAGS.find(t => t.id === id);
