export type FocusLevel = 'deep' | 'light' | 'off';
export type EnergyLevel = 'high' | 'low';

export interface Entry {
  id: string;
  text: string;
  tags: string[];
  focus: FocusLevel;
  energy: EnergyLevel;
  createdAt: string; // ISO string
  updatedAt: string;
  intervalMinutes: number;
  dateKey: string; // YYYY-MM-DD
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
