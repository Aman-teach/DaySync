/**
 * app/(tabs)/stats.tsx — Route entry point
 *
 * This file is the Expo Router entry point for the Stats tab.
 * It delegates entirely to StatsScreenV2 (the rebuilt architecture).
 *
 * The legacy implementation is preserved safely at:
 *   features/stats/legacy/stats.legacy.tsx
 *
 * To roll back: import and default-export from that path.
 */
export { default } from '@/features/stats/StatsScreenV2';
