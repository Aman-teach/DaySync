export interface TagConfig {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

export const TAGS: TagConfig[] = [
  { id: 'deep-work', label: 'Deep Work', emoji: '🧠', color: '#1B4332', bg: '#B7E4C7' },
  { id: 'work',      label: 'Work',      emoji: '💼', color: '#1A5276', bg: '#D6EAF8' },
  { id: 'meeting',   label: 'Meeting',   emoji: '🤝', color: '#6C3483', bg: '#E8DAEF' },
  { id: 'exercise',  label: 'Exercise',  emoji: '🏃', color: '#7D6608', bg: '#FEF3C7' },
  { id: 'break',     label: 'Break',     emoji: '☕', color: '#0E6655', bg: '#D1F2EB' },
  { id: 'social',    label: 'Social',    emoji: '💬', color: '#922B21', bg: '#FADBD8' },
  { id: 'admin',     label: 'Admin',     emoji: '📋', color: '#5D4037', bg: '#EFEBE9' },
  { id: 'learning',  label: 'Learning',  emoji: '📚', color: '#1A5276', bg: '#D4E6F1' },
  { id: 'reading',   label: 'Reading',   emoji: '📖', color: '#4A235A', bg: '#F5EEF8' },
  { id: 'writing',   label: 'Writing',   emoji: '✍️',  color: '#784212', bg: '#FDF2E9' },
  { id: 'planning',  label: 'Planning',  emoji: '🗓️',  color: '#154360', bg: '#D6EAF8' },
  { id: 'personal',  label: 'Personal',  emoji: '🌿', color: '#7B241C', bg: '#FDEDEC' },
];

export const getTag = (id: string): TagConfig | undefined =>
  TAGS.find(t => t.id === id);
