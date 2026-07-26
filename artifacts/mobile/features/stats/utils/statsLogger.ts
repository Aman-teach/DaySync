/**
 * statsLogger.ts
 *
 * Centralized logging abstraction for the Stats feature domain.
 *
 * All diagnostic output routes through this module. This enables:
 *  - Dev: human-readable console output with context prefixes
 *  - Prod: drop-in replacement to Sentry / Firebase Crashlytics / LogRocket
 *          by swapping the implementations below, with zero changes
 *          to callers across the feature.
 *
 * Usage:
 *   statsLogger.warn('validation', 'Entry discarded', { id, reason });
 *   statsLogger.error('section', 'HeatmapSection crashed', error);
 */

type StatsContext =
  | 'validation'   // Zod schema failures, corrupt entries
  | 'section'      // Error Boundary catches from UI sections
  | 'hook'         // Unexpected failures inside domain hooks
  | 'general';     // Anything that does not fit a specific category

const PREFIX = '[DaySync:Stats]';

/**
 * Internal helper — keeps the output format consistent regardless
 * of which backend is receiving the log.
 */
function format(context: StatsContext, message: string): string {
  return `${PREFIX}[${context.toUpperCase()}] ${message}`;
}

// ---------------------------------------------------------------------------
// Swap these implementations to point to Sentry, Crashlytics, etc.
// ---------------------------------------------------------------------------
function _warn(context: StatsContext, message: string, meta?: object): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(format(context, message), meta ?? '');
  }
  // Production: e.g. Sentry.captureMessage(format(context, message), { level: 'warning', extra: meta });
}

function _error(context: StatsContext, message: string, error?: Error | unknown): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(format(context, message), error ?? '');
  }
  // Production: e.g. Sentry.captureException(error, { extra: { context, message } });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const statsLogger = {
  /**
   * Use for recoverable failures and informational diagnostics.
   * Examples: repaired entries, fallback values applied, missing optional fields.
   */
  warn(context: StatsContext, message: string, meta?: object): void {
    _warn(context, message, meta);
  },

  /**
   * Use for unrecoverable failures or unexpected rendering errors.
   * Examples: section crash caught by Error Boundary, corrupt entry discarded.
   */
  error(context: StatsContext, message: string, error?: Error | unknown): void {
    _error(context, message, error);
  },
};
