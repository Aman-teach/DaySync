export type FocusLevel = 'deep' | 'normal' | 'distracted' | 'neutral' | 'light' | 'off';
export type EnergyLevel = 'high' | 'medium' | 'low';

export interface Domain {
  id: string;
  name: string;
  icon: string;
  color: string;
  position: number;
}

export interface Activity {
  id: string;
  domainId: string;
  name: string;
  icon?: string;
  position: number;
}

export interface Entry {
  id: string;
  text: string;
  tags?: string[]; // Optional for legacy compatibility
  domainId?: string; // New field for redesigned logging
  activityId?: string; // New field for redesigned logging
  duration?: number; // New explicit duration field
  focus: FocusLevel;
  energy: EnergyLevel;
  leverage?: 'high' | 'busywork';
  createdAt: string; // ISO string
  updatedAt: string;
  intervalMinutes: number; // Keep for legacy data
  dateKey: string; // YYYY-MM-DD
  taskId?: string; // Links to AtlasOS tasks
  taskTitle?: string;
  imageUrl?: string; // Local URI of attached photo
  isDeleted?: boolean;
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
  tomorrowPlan?: string[];
  createdAt: string;
  isDeleted?: boolean;
}

export interface Settings {
  interval: 15 | 30 | 60 | 90;
  activeStart: number; // hour 0-23
  activeEnd: number;
  dayStartHour: number;
  notificationsEnabled: boolean;
  lastExport?: string;
}
