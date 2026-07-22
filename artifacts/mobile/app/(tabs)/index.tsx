import React, { useCallback, useRef } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { MascotRobot } from '@/components/MascotRobot';
import { CountdownTimer } from '@/components/CountdownTimer';
import { EntryCard } from '@/components/EntryCard';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getDateKey } from '@/utils/helpers';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { todayEntries, focusScore, settings, daySummaries, generateDayWrap, isLoading, reload } =
    useApp();

  const todayKey = getDateKey(new Date(), settings.dayStartHour);
  const todaySummary = daySummaries.find(s => s.dateKey === todayKey);
  const [generating, setGenerating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleGenerateWrap = async () => {
    setGenerating(true);
    await generateDayWrap(todayKey);
    setGenerating(false);
  };

  const topPad =
    Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <MascotRobot size={64} />
          <View style={styles.titleBlock}>
            <Text style={[styles.appName, { color: colors.primary }]}>Atlas Cadence</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {new Date().toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Score + Countdown card */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{focusScore}</Text>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Focus Score</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <CountdownTimer />
        </View>

        {/* Quick Log CTA */}
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/checkin')}
          activeOpacity={0.85}
        >
          <Feather name="edit-3" size={18} color="#fff" />
          <Text style={styles.logButtonText}>Log Now</Text>
        </TouchableOpacity>

        {/* Today's entries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Today's Log
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                {todayEntries.length}
              </Text>
            </View>
          </View>

          {todayEntries.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sun" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No entries yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap "Log Now" to start building your day's timeline.
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {todayEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </View>
          )}
        </View>

        {/* Day Wrap */}
        {(todayEntries.length >= 3) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Day Wrap
              </Text>
            </View>
            {todaySummary ? (
              <View style={[styles.wrapCard, { backgroundColor: colors.card, borderColor: colors.primary + '44' }]}>
                <Text style={[styles.wrapSummary, { color: colors.foreground }]}>
                  {todaySummary.summary}
                </Text>
                {todaySummary.highlights.map((h, i) => (
                  <View key={i} style={styles.highlight}>
                    <View style={[styles.highlightDot, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.highlightText, { color: colors.foreground }]}>{h}</Text>
                  </View>
                ))}
                {todaySummary.mood ? (
                  <Text style={[styles.mood, { color: colors.mutedForeground }]}>
                    {todaySummary.mood}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.regenBtn, { borderColor: colors.border }]}
                  onPress={handleGenerateWrap}
                  disabled={generating}
                >
                  <Text style={[styles.regenText, { color: colors.mutedForeground }]}>
                    {generating ? 'Regenerating...' : 'Regenerate'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={handleGenerateWrap}
                disabled={generating}
                activeOpacity={0.8}
              >
                <Feather name="zap" size={16} color={colors.primary} />
                <Text style={[styles.generateText, { color: colors.primary }]}>
                  {generating ? 'Generating AI summary...' : 'Generate Day Wrap'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating log button */}
      <View
        style={[
          styles.fab,
          {
            bottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 88,
            right: 20,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/checkin')}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 4 },
  titleBlock: { flex: 1 },
  appName: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  date: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 20,
  },
  scoreBlock: { alignItems: 'center', flex: 1 },
  scoreNum: { fontSize: 48, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  scoreLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: -4 },
  divider: { width: 1, height: 48 },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 100,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  badgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  timeline: { gap: 0 },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  wrapCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  wrapSummary: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 21 },
  highlight: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  highlightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  highlightText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  mood: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  regenBtn: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  regenText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  generateText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  fab: { position: 'absolute' },
  fabBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});
