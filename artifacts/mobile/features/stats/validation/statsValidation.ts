import { z } from 'zod';
import type { Entry } from '@/types';
import { statsLogger } from '../utils/statsLogger';

/**
 * Attempts to safely repair malformed date strings (like SQL timestamps)
 * into strict ISO-8601 strings compatible with Android Hermes.
 */
const repairDateString = (val: unknown): string => {
  if (typeof val !== 'string') return '';
  
  // If natively valid, return as-is
  if (!isNaN(new Date(val).getTime())) return val;
  
  // Attempt to repair SQL-style "YYYY-MM-DD HH:MM:SS" to ISO-8601
  const repaired = val.replace(' ', 'T');
  if (!isNaN(new Date(repaired).getTime())) return repaired;
  
  return ''; // Cannot be repaired
};

/**
 * Strict schema for incoming entries into the Stats domain.
 * Safely defaults missing recoverable fields.
 */
export const StatsEntrySchema = z.object({
  // Recoverable: Give it a fallback ID for React keys if missing
  id: z.string().catch(() => Date.now().toString() + Math.random().toString(36).slice(2)),
  
  // Recoverable: Default empty strings/arrays
  text: z.string().catch(''),
  tags: z.array(z.string()).catch([]),
  
  // Domain & Activity — pass through as-is, optional
  domainId: z.string().optional(),
  activityId: z.string().optional(),
  duration: z.number().optional(),
  isDeleted: z.boolean().optional(),
  
  // Recoverable: Fallback to sensible defaults
  focus: z.enum(['deep', 'normal', 'distracted', 'neutral', 'light', 'off']).catch('deep'),
  energy: z.string().catch('high'),
  intervalMinutes: z.number().nonnegative().catch(30),
  dateKey: z.string().catch(''),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  leverage: z.string().optional(),
  imageUrl: z.string().optional(),
  
  // Unrecoverable if invalid: Time-series stats rely absolutely on createdAt.
  // We run it through a preprocessor to attempt safe repairs first.
  createdAt: z.preprocess(
    repairDateString,
    z.string().refine(val => val !== '' && !isNaN(new Date(val).getTime()), {
      message: "Unrecoverable date format",
    })
  ),
  
  updatedAt: z.string().optional(),
});

/**
 * Validates raw data entering the stats domain.
 * Recovers missing fields safely, logs unrecoverable fatal errors, 
 * and only discards entries that absolutely cannot be processed.
 */
export function validateStatsEntries(rawEntries: any[]): Entry[] {
  if (!Array.isArray(rawEntries)) {
    statsLogger.error('validation', 'Expected array of entries, received non-array', { type: typeof rawEntries });
    return [];
  }
  
  return rawEntries.reduce((acc, raw) => {
    const result = StatsEntrySchema.safeParse(raw);
    if (result.success) {
      // Skip soft-deleted entries — they must never appear in stats
      if (!result.data.isDeleted) {
        acc.push(result.data as Entry);
      }
    } else {
      // Log unrecoverable entries for diagnostics — traceable via statsLogger backend
      statsLogger.warn('validation', 'Unrecoverable entry discarded', {
        id: raw?.id ?? 'unknown',
        reasons: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }
    return acc;
  }, [] as Entry[]);
}
