import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { EntryCard } from '@/components/EntryCard';
import { Feather } from '@expo/vector-icons';
import { getFocusScore, parseDateKeySafely } from '@/utils/helpers';

export default function HistoryDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { entries, daySummaries } = useApp();

  const dayEntries = useMemo(() => entries.filter(e => e.dateKey === date), [entries, date]);
  const summary = useMemo(() => daySummaries.find(s => s.dateKey === date), [daySummaries, date]);
  const focusScore = useMemo(() => getFocusScore(dayEntries), [dayEntries]);

  // Parse date for display
  const dateObj = useMemo(() => {
    return parseDateKeySafely(date as string);
  }, [date]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.navHeader, { paddingTop: topPad, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          {dateObj ? dateObj.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }) : `Invalid Date (${date})`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={dayEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <>
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scoreBlock}>
                <Text style={[styles.scoreNum, { color: colors.primary }]}>{focusScore}</Text>
                <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Focus Score</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.scoreBlock}>
                <Text style={[styles.scoreNum, { color: colors.foreground }]}>{dayEntries.length}</Text>
                <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Entries Logged</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Timeline
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyWrapText, { color: colors.mutedForeground }]}>
            No entries found.
          </Text>
        }
        renderItem={({ item }) => (
          <EntryCard entry={item} />
        )}
        ListFooterComponent={
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Day Wrap
              </Text>
            </View>
            {summary ? (
              <View style={[styles.wrapCard, { backgroundColor: colors.card, borderColor: colors.primary + '33' }]}>
                <Text style={[styles.wrapSummary, { color: colors.foreground }]}>
                  {summary.summary}
                </Text>

                <View style={styles.wrapGrid}>
                  {/* Wins */}
                  <View style={styles.wrapCol}>
                    <Text style={[styles.wrapSubTitle, { color: colors.mutedForeground }]}>
                      TODAY'S WINS
                    </Text>
                    {summary.highlights?.map((h, i) => (
                      <View key={i} style={styles.listItem}>
                        <Feather name="check" size={14} color="#10B981" />
                        <Text style={[styles.listText, { color: colors.foreground }]}>{h}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Distractions */}
                  <View style={styles.wrapCol}>
                    <Text style={[styles.wrapSubTitle, { color: colors.mutedForeground }]}>
                      DISTRACTIONS & LEAKS
                    </Text>
                    {summary.anomalies?.map((a, i) => (
                      <View key={i} style={styles.listItem}>
                        <Feather name="alert-circle" size={14} color="#EF4444" />
                        <Text style={[styles.listText, { color: colors.foreground }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Advice */}
                <View style={[styles.adviceBox, { backgroundColor: colors.background, borderColor: '#10B98133' }]}>
                  <View style={styles.adviceHeader}>
                    <Feather name="target" size={14} color="#10B981" />
                    <Text style={[styles.adviceTitle, { color: '#10B981' }]}>TOMORROW'S NAVIGATOR</Text>
                  </View>
                  <Text style={[styles.adviceText, { color: colors.foreground }]}>{summary.guideAdvice}</Text>
                </View>

                {/* Mood */}
                {summary.mood && (
                  <View style={styles.moodBox}>
                    <Feather name="zap" size={12} color="#F59E0B" />
                    <Text style={[styles.moodText, { color: colors.mutedForeground }]}>
                      {summary.mood}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="wind" size={24} color={colors.mutedForeground} />
                <Text style={[styles.emptyWrapText, { color: colors.mutedForeground }]}>
                  No Day Wrap generated for this date.
                </Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 32 },
  
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scoreNum: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 40,
  },

  section: { gap: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  timeline: { gap: 12 },

  wrapCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 24,
  },
  wrapSummary: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  wrapGrid: {
    gap: 20,
  },
  wrapCol: {
    gap: 12,
  },
  wrapSubTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  adviceBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adviceTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  adviceText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  moodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  moodText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    fontStyle: 'italic',
  },
  emptyWrap: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  emptyWrapText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
});
