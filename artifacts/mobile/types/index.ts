export type FocusLevel = 'deep' | 'light' | 'neutral' | 'off';
export type EnergyLevel = 'high' | 'low';

export interface Entry {
  id: string;
  text: string;
  tags: string[];
  focus: FocusLevel;
  energy: EnergyLevel;
  leverage?: 'high' | 'busywork';
  createdAt: string; // ISO string
  updatedAt: string;
  intervalMinutes: number;
  dateKey: string; // YYYY-MM-DD
  taskId?: string; // Links to AtlasOS tasks
  taskTitle?: string;
  imageUrl?: string; // Local URI of attached photo
}

export interface AtlasTask {
  id: string;
  title: string;
  status: string;
}

export interface DaySummary {
  id: string;
  dateKey: string;
  summary: string;
  highlights: string[];
  tagBreakdown: Record<string, number>; // tag -> minutes
  focusStreaks: number[];
  mood: string;
  anomalies: string[];
  guideAdvice?: string;
  createdAt: string;
}

export interface Settings {
  interval: 15 | 30 | 60 | 90;
  activeStart: number; // hour 0-23
  activeEnd: number;
  dayStartHour: number;
  notificationsEnabled: boolean;
  lastExport?: string;
}
