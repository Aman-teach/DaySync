import React, { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { StatsRing } from '@/components/StatsRing';
import { HeatmapCalendar } from '@/components/HeatmapCalendar';
import { TagChip } from '@/components/TagChip';
import {
  getEntriesForDate,
  getLast30DayKeys,
  getFocusScore,
  getDeepWorkByHour,
  getConsecutiveDayStreak,
  formatHour,
} from '@/utils/helpers';
import { getTag } from '@/constants/tags';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { entries, settings } = useApp();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const last30Keys = getLast30DayKeys(settings.dayStartHour);

  // Build heatmap data
  const heatmapData = useMemo(() => {
    const data: Record<string, number> = {};
    for (const key of last30Keys) {
      const dayEntries = getEntriesForDate(entries, key);
      if (dayEntries.length > 0) {
        data[key] = getFocusScore(dayEntries);
      }
    }
    return data;
  }, [entries, last30Keys]);

  // Focus breakdown (all-time)
  const allDeep = entries.filter(e => e.focus === 'deep').length;
  const allLight = entries.filter(e => e.focus === 'light').length;
  const allOff = entries.filter(e => e.focus === 'off').length;
  const allTotal = entries.length;

  const ringSegments = [
    { value: allDeep, color: '#2D6A4F', label: 'Deep' },
    { value: allLight, color: '#E8A838', label: 'Light' },
    { value: allOff, color: '#9CA3AF', label: 'Off' },
  ];

  // Tag breakdown
  const tagMinutes = useMemo(() => {
    const bd: Record<string, number> = {};
    for (const e of entries) {
      for (const tag of e.tags) {
        bd[tag] = (bd[tag] ?? 0) + e.intervalMinutes;
      }
    }
    return Object.entries(bd).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  const maxTagMin = tagMinutes[0]?.[1] ?? 1;

  // Deep work by hour
  const deepByHour = useMemo(() => getDeepWorkByHour(entries), [entries]);
  const maxDeepByHour = Math.max(...deepByHour, 1);

  // Streak
  const streak = getConsecutiveDayStreak(entries, settings.dayStartHour);

  // Pattern cards
  const patterns = useMemo(() => {
    const results: string[] = [];
    const hourCounts = getDeepWorkByHour(entries);
    const morningCount = hourCounts.slice(6, 12).reduce((a, b) => a + b, 0);
    const afternoonCount = hourCounts.slice(12, 18).reduce((a, b) => a + b, 0);
    const eveningCount = hourCounts.slice(18, 22).reduce((a, b) => a + b, 0);

    if (morningCount > afternoonCount && morningCount > eveningCount) {
      results.push('Your deep focus peaks in the morning.');
    } else if (afternoonCount > morningCount && afternoonCount > eveningCount) {
      results.push('Your best focus tends to happen in the afternoon.');
    } else if (eveningCount > morningCount) {
      results.push('You get meaningful work done in the evenings.');
    }

    const deepPct = allTotal > 0 ? (allDeep / allTotal) * 100 : 0;
    if (deepPct >= 60) results.push(`${Math.round(deepPct)}% of your logged time is deep focus — well above average.`);
    else if (deepPct < 30 && allTotal > 5) results.push('Less than a third of your time is deep focus — there may be room to protect your attention more.');

    if (streak >= 7) results.push(`${streak}-day streak — you're building a consistent rhythm.`);

    return results.slice(0, 3);
  }, [entries, allDeep, allTotal, streak]);

  if (entries.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyContainer, { paddingTop: topPad + 40 }]}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No data yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Start logging check-ins and your patterns will appear here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad + 12,
            paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Patterns</Text>

        {/* Focus ring */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Mix</Text>
          <StatsRing
            segments={ringSegments}
            centerLabel={`${allTotal}`}
            centerSub="blocks"
          />
        </View>

        {/* Streak + score */}
        <View style={styles.row2}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bigNum, { color: colors.primary }]}>{streak}</Text>
            <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bigNum, { color: colors.primary }]}>
              {allTotal > 0 ? Math.round((allDeep / allTotal) * 100) : 0}%
            </Text>
            <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Deep Rate</Text>
          </View>
        </View>

        {/* Deep work by hour */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Deep Work by Hour</Text>
          <View style={styles.hourChart}>
            {deepByHour.map((count, h) => {
              const barH = Math.max(2, (count / maxDeepByHour) * 60);
              const isActive = h >= settings.activeStart && h < settings.activeEnd;
              return (
                <View key={h} style={styles.hourCol}>
                  <View
                    style={[
                      styles.hourBar,
                      {
                        height: barH,
                        backgroundColor: count > 0 ? colors.primary : colors.muted,
                        opacity: isActive ? 1 : 0.4,
                      },
                    ]}
                  />
                  {(h % 4 === 0) && (
                    <Text style={[styles.hourLabel, { color: colors.mutedForeground }]}>
                      {formatHour(h)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Tag breakdown */}
        {tagMinutes.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Time by Tag</Text>
            <View style={styles.tagList}>
              {tagMinutes.map(([tagId, mins]) => {
                const tag = getTag(tagId);
                const pct = mins / maxTagMin;
                const hours = Math.floor(mins / 60);
                const minsRem = mins % 60;
                const timeStr = hours > 0 ? `${hours}h ${minsRem}m` : `${minsRem}m`;
                return (
                  <View key={tagId} style={styles.tagRow}>
                    <View style={styles.tagRowHeader}>
                      <TagChip tagId={tagId} size="sm" />
                      <Text style={[styles.tagTime, { color: colors.mutedForeground }]}>{timeStr}</Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${pct * 100}%`,
                            backgroundColor: tag?.color ?? colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Calendar heatmap */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Heatmap</Text>
          <View style={styles.heatmapWrapper}>
            <HeatmapCalendar data={heatmapData} weeks={16} />
          </View>
          <View style={styles.heatmapLegend}>
            <Text style={[styles.heatLegendText, { color: colors.mutedForeground }]}>Less</Text>
            {['#B7E4C7', '#74C69D', '#40916C', '#1B4332'].map(c => (
              <View key={c} style={[styles.heatCell, { backgroundColor: c }]} />
            ))}
            <Text style={[styles.heatLegendText, { color: colors.mutedForeground }]}>More</Text>
          </View>
        </View>

        {/* Pattern cards */}
        {patterns.length > 0 && (
          <View style={styles.card2}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Observations</Text>
            <View style={styles.patternList}>
              {patterns.map((p, i) => (
                <View key={i} style={[styles.patternCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.patternText, { color: colors.foreground }]}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 14 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
  card2: { gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  row2: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  bigNum: { fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -1.5 },
  bigLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  hourChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 80,
  },
  hourCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  hourBar: { width: '100%', borderRadius: 2 },
  hourLabel: { fontSize: 8, fontFamily: 'Inter_500Medium' },
  tagList: { gap: 10 },
  tagRow: { gap: 6 },
  tagRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagTime: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  heatmapWrapper: { paddingLeft: 20, overflow: 'hidden' },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  heatCell: { width: 10, height: 10, borderRadius: 2 },
  heatLegendText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  patternList: { gap: 8 },
  patternCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  patternText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
});
