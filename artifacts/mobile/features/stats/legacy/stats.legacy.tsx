import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  getDateKey,
  formatHour,
  getDeltaScore,
  getTimeWasted,
} from '@/utils/helpers';
import { getTag } from '@/constants/tags';
import { Feather } from '@expo/vector-icons';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { entries, settings } = useApp();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const last30Keys = getLast30DayKeys(settings.dayStartHour);
  const todayKey = getDateKey(new Date(), settings.dayStartHour);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getDateKey(yesterdayDate, settings.dayStartHour);

  const todayEntries = useMemo(() => getEntriesForDate(entries, todayKey), [entries, todayKey]);
  const yesterdayEntries = useMemo(() => getEntriesForDate(entries, yesterdayKey), [entries, yesterdayKey]);

  const todayScore = getFocusScore(todayEntries);
  const yesterdayScore = getFocusScore(yesterdayEntries);
  const delta = getDeltaScore(todayEntries, yesterdayEntries);

  const todayWasted = getTimeWasted(todayEntries);
  const yesterdayWasted = getTimeWasted(yesterdayEntries);
  const wasteDelta = todayWasted - yesterdayWasted;

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
  const [tagTimeframe, setTagTimeframe] = useState<'today' | 'yesterday' | 'week' | 'all'>('all');

  const tagMinutes = useMemo(() => {
    let targetEntries = entries;
    if (tagTimeframe === 'today') {
      targetEntries = todayEntries;
    } else if (tagTimeframe === 'yesterday') {
      targetEntries = yesterdayEntries;
    } else if (tagTimeframe === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      targetEntries = entries.filter(e => new Date(e.createdAt) >= sevenDaysAgo);
    }
    
    const bd: Record<string, number> = {};
    for (const e of targetEntries) {
      if (!e.tags) continue; // Safe fallback for corrupted old entries
      for (const tag of e.tags) {
        bd[tag] = (bd[tag] ?? 0) + (e.intervalMinutes || 0);
      }
    }
    return Object.entries(bd).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tagTimeframe, todayEntries, yesterdayEntries, entries]);

  const maxTagMin = Math.max(tagMinutes[0]?.[1] ?? 1, 1);

  // Task Breakdown
  const [taskTimeframe, setTaskTimeframe] = useState<'today' | 'yesterday' | 'week'>('today');

  const taskBreakdown = useMemo(() => {
    let targetEntries = todayEntries;
    if (taskTimeframe === 'yesterday') {
      targetEntries = yesterdayEntries;
    } else if (taskTimeframe === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      targetEntries = entries.filter(e => new Date(e.createdAt) >= sevenDaysAgo);
    }
    
    const bd: Record<string, { title: string; mins: number }> = {};
    for (const e of targetEntries) {
      if (e.taskId && e.taskTitle) {
        if (!bd[e.taskId]) bd[e.taskId] = { title: e.taskTitle, mins: 0 };
        bd[e.taskId].mins += (e.intervalMinutes || 0);
      }
    }
    return Object.entries(bd)
      .sort((a, b) => b[1].mins - a[1].mins)
      .slice(0, 10);
  }, [taskTimeframe, todayEntries, yesterdayEntries, entries]);

  const maxTaskMin = Math.max(taskBreakdown[0]?.[1]?.mins ?? 1, 1);

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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Versus</Text>
        
        {/* You vs You Delta */}
        <View style={styles.versusRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bigNum, { color: colors.mutedForeground }]}>{yesterdayScore}</Text>
            <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Yesterday</Text>
          </View>
          
          <View style={[styles.vsBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bigNum, { color: colors.foreground }]}>{todayScore}</Text>
            <Text style={[styles.bigLabel, { color: colors.primary }]}>Today</Text>
          </View>
        </View>

        {/* Time Waste Trajectory Warning */}
        {(yesterdayEntries.length > 0 && todayEntries.length > 0 && wasteDelta > 0) && (
          <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444433' }]}>
            <View style={styles.warningHeader}>
              <Feather name="alert-triangle" size={18} color="#EF4444" />
              <Text style={styles.warningTitle}>LEAK TRAJECTORY</Text>
            </View>
            <Text style={[styles.warningText, { color: colors.foreground }]}>
              You spent <Text style={{ fontFamily: 'Inter_700Bold', color: '#EF4444' }}>{wasteDelta} minutes more</Text> on off-focus tasks today compared to yesterday. Your discipline is slipping.
            </Text>
          </View>
        )}
        
        {(yesterdayEntries.length > 0 && todayEntries.length > 0 && wasteDelta < 0) && (
          <View style={[styles.warningCard, { backgroundColor: '#10B98115', borderColor: '#10B98133' }]}>
            <View style={styles.warningHeader}>
              <Feather name="trending-down" size={18} color="#10B981" />
              <Text style={[styles.warningTitle, { color: '#10B981' }]}>LEAK REDUCTION</Text>
            </View>
            <Text style={[styles.warningText, { color: colors.foreground }]}>
              You wasted <Text style={{ fontFamily: 'Inter_700Bold', color: '#10B981' }}>{Math.abs(wasteDelta)} fewer minutes</Text> today than yesterday. Great boundary control.
            </Text>
          </View>
        )}

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
                        height: isNaN(barH) ? 2 : barH,
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

        {/* Task Journey */}
        {/* Task Journey */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Task Journey</Text>
            <View style={[styles.timeframeToggle, { backgroundColor: colors.muted }]}>
              {(['today', 'yesterday', 'week'] as const).map(tf => (
                <TouchableOpacity
                  key={tf}
                  style={[styles.timeframeBtn, taskTimeframe === tf && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }]}
                  onPress={() => setTaskTimeframe(tf)}
                >
                  <Text style={[styles.timeframeText, { color: taskTimeframe === tf ? colors.foreground : colors.mutedForeground }]}>
                    {tf === 'week' ? '7 Days' : tf.charAt(0).toUpperCase() + tf.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {taskBreakdown.length > 0 ? (
            <View style={styles.taskListStats}>
              {taskBreakdown.map(([taskId, data]) => {
                const pct = data.mins / maxTaskMin;
                const hours = Math.floor(data.mins / 60);
                const minsRem = data.mins % 60;
                const timeStr = hours > 0 ? `${hours}h ${minsRem}m` : `${minsRem}m`;
                return (
                  <View key={taskId} style={styles.taskStatRow}>
                    <View style={styles.taskStatHeader}>
                      <Text style={[styles.taskStatTitle, { color: colors.foreground }]} numberOfLines={1}>{data.title}</Text>
                      <Text style={[styles.tagTime, { color: colors.mutedForeground }]}>{timeStr}</Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${(isNaN(pct) ? 0 : pct) * 100}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                No tasks logged for this timeframe.
              </Text>
            </View>
          )}
        </View>

        {/* Tag breakdown */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Time by Tag</Text>
            <View style={[styles.timeframeToggle, { backgroundColor: colors.muted }]}>
              {(['today', 'yesterday', 'week', 'all'] as const).map(tf => (
                <TouchableOpacity
                  key={tf}
                  style={[styles.timeframeBtn, tagTimeframe === tf && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }]}
                  onPress={() => setTagTimeframe(tf)}
                >
                  <Text style={[styles.timeframeText, { color: tagTimeframe === tf ? colors.foreground : colors.mutedForeground }]}>
                    {tf === 'week' ? '7 Days' : (tf === 'all' ? 'All' : tf.charAt(0).toUpperCase() + tf.slice(1))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {tagMinutes.length > 0 ? (
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
                            width: `${(isNaN(pct) ? 0 : pct) * 100}%`,
                            backgroundColor: tag?.color ?? colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                No tags logged for this timeframe.
              </Text>
            </View>
          )}
        </View>

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
  
  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 8,
    position: 'relative',
  },
  vsBadge: {
    position: 'absolute',
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  vsText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  warningCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginVertical: 4,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    color: '#EF4444',
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeframeToggle: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  timeframeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  timeframeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  taskListStats: { gap: 12 },
  taskStatRow: { gap: 6 },
  taskStatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  taskStatTitle: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
});
