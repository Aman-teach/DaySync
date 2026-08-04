import React, { useCallback, useRef } from 'react';
import {
  Alert,
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
import { getDateKey, getEntriesForDate, getDeltaScore } from '@/utils/helpers';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { entries, todayEntries, focusScore, settings, daySummaries, generateDayWrap, isLoading, reload } =
    useApp();

  const todayKey = getDateKey(new Date(), settings.dayStartHour);
  const todaySummary = daySummaries.find(s => s.dateKey === todayKey);
  const [generating, setGenerating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [fabOpen, setFabOpen] = React.useState(false);
  const fabAnim = useSharedValue(0);

  // Live time for header
  const [currentTime, setCurrentTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const toggleFab = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const nextState = !fabOpen;
    setFabOpen(nextState);
    fabAnim.value = withSpring(nextState ? 1 : 0, { damping: 15, stiffness: 200, mass: 0.8 });
  };

  const fabPlusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(fabAnim.value, [0, 1], [0, 45])}deg` }]
  }));

  const miniFabVoiceStyle = useAnimatedStyle(() => ({
    opacity: fabAnim.value,
    transform: [
      { translateY: interpolate(fabAnim.value, [0, 1], [20, 0]) },
      { scale: interpolate(fabAnim.value, [0, 1], [0.5, 1]) }
    ],
  }));

  const miniFabTextStyle = useAnimatedStyle(() => ({
    opacity: fabAnim.value,
    transform: [
      { translateY: interpolate(fabAnim.value, [0, 1], [40, 0]) },
      { scale: interpolate(fabAnim.value, [0, 1], [0.5, 1]) }
    ],
  }));

  const deltaScore = React.useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday, settings.dayStartHour);
    const yesterdayEntries = getEntriesForDate(entries, yesterdayKey);
    
    // Only show delta if they actually logged something yesterday
    if (yesterdayEntries.length === 0) return null;
    return getDeltaScore(todayEntries, yesterdayEntries);
  }, [entries, todayEntries, settings.dayStartHour]);

  // Dynamic, personality-driven motivation message
  const motivationMessage = React.useMemo(() => {
    const h = currentTime.getHours();
    const lastEntry = todayEntries.length > 0 ? todayEntries[todayEntries.length - 1] : null;
    const lastFocus = lastEntry?.focus;
    const entryCount = todayEntries.length;

    // First thing in the morning, no logs yet
    if (entryCount === 0) {
      if (h >= 5 && h < 9)
        return { icon: 'sunrise', text: "Morning. Blank slate. What's the first thing worth tracking today?", color: '#F59E0B' };
      if (h >= 9 && h < 12)
        return { icon: 'coffee', text: "Still no entries. The day's burning — log something now.", color: '#EF4444' };
      if (h >= 12 && h < 17)
        return { icon: 'clock', text: "Half the day's gone and the log is empty. Start now, no matter how small.", color: '#EF4444' };
      if (h >= 17)
        return { icon: 'moon', text: "Evening. If you did anything useful today, it's not too late to capture it.", color: '#8B5CF6' };
    }

    // Score-based with personality
    if (focusScore >= 90)
      return { icon: 'zap', text: "On fire. This is one of those days you'll look back on.", color: '#10B981' };

    if (focusScore >= 70) {
      if (deltaScore !== null && deltaScore > 0)
        return { icon: 'trending-up', text: `Up ${deltaScore} pts from yesterday. Momentum is compounding.`, color: '#10B981' };
      return { icon: 'shield', text: "Solid day. Deep focus is your best asset — protect it.", color: '#10B981' };
    }

    if (focusScore >= 40) {
      if (lastFocus === 'distracted')
        return { icon: 'alert-triangle', text: "Last block was distracted. Happens. Reset and go again.", color: '#F59E0B' };
      if (lastFocus === 'deep')
        return { icon: 'zap', text: "You're in it. Don't stop here — one more deep block.", color: '#3B82F6' };
      return { icon: 'activity', text: `${entryCount} blocks logged. The second half of the day matters too.`, color: '#6366F1' };
    }

    if (focusScore > 0) {
      if (deltaScore !== null && deltaScore < 0)
        return { icon: 'trending-down', text: `Score is down ${Math.abs(deltaScore)} from yesterday. Time to course-correct.`, color: '#EF4444' };
      if (entryCount >= 3)
        return { icon: 'target', text: "Logged, but focus quality is low. Quality beats quantity — go deep.", color: '#F59E0B' };
      return { icon: 'play', text: "You've started. Now lock in — a focused hour beats a scattered three.", color: '#3B82F6' };
    }

    // Negative score
    return { icon: 'refresh-cw', text: "Today's been rough. One deep block can still flip the day. Go.", color: '#EF4444' };
  }, [focusScore, todayEntries, deltaScore, currentTime]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleGenerateWrap = async () => {
    setGenerating(true);
    try {
      const summary = await generateDayWrap(todayKey);
      if (!summary) {
        if (Platform.OS === 'web') window.alert("Failed to generate Day Wrap. Ensure you have network connectivity and API keys are active.");
        else Alert.alert("Error", "Failed to generate Day Wrap.");
      }
    } catch (err) {
      if (Platform.OS === 'web') window.alert("Generation error: " + String(err));
      else Alert.alert("Error", "Generation error: " + String(err));
    } finally {
      setGenerating(false);
    }
  };

  const isWeb = Platform.OS === 'web';

  // ─── Day Wrap content (shared between web/mobile layouts) ────────────────
  const dayWrapContent = todayEntries.length >= 3 ? (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Execution Guide</Text>
      </View>
      {todaySummary ? (
        <View style={[styles.wrapCard, { backgroundColor: colors.card, borderColor: colors.primary + '33' }]}>
          <Text style={[styles.wrapSummary, { color: colors.foreground }]}>{todaySummary.summary}</Text>
          {todaySummary.highlights && todaySummary.highlights.length > 0 && (
            <View style={styles.wrapSection}>
              <View style={styles.sectionLabelRow}>
                <Feather name="check-circle" size={12} color="#52B788" />
                <Text style={[styles.wrapSectionLabel, { color: '#52B788' }]}>WHAT WENT WELL</Text>
              </View>
              {todaySummary.highlights.map((h, i) => (
                <View key={i} style={styles.highlight}>
                  <Feather name="check" size={14} color="#52B788" style={styles.highlightIcon} />
                  <Text style={[styles.highlightText, { color: colors.foreground }]}>{h}</Text>
                </View>
              ))}
            </View>
          )}
          {todaySummary.anomalies && todaySummary.anomalies.length > 0 && (
            <View style={styles.wrapSection}>
              <View style={styles.sectionLabelRow}>
                <Feather name="alert-triangle" size={12} color="#EF4444" />
                <Text style={[styles.wrapSectionLabel, { color: '#EF4444' }]}>WHERE YOU SLIPPED</Text>
              </View>
              {todaySummary.anomalies.map((a, i) => (
                <View key={i} style={styles.highlight}>
                  <Feather name="minus" size={14} color="#EF4444" style={styles.highlightIcon} />
                  <Text style={[styles.highlightText, { color: colors.foreground }]}>{a}</Text>
                </View>
              ))}
            </View>
          )}
          {(todaySummary.guideAdvice || (todaySummary.tomorrowPlan && todaySummary.tomorrowPlan.length > 0)) && (
            <View style={[styles.adviceCard, { backgroundColor: colors.primary + '0d', borderColor: colors.primary + '33' }]}>
              <View style={styles.adviceHeader}>
                <Feather name="sunrise" size={13} color={colors.primary} />
                <Text style={[styles.adviceTitle, { color: colors.primary }]}>TOMORROW'S PLAN</Text>
              </View>
              {todaySummary.guideAdvice ? (
                <Text style={[styles.adviceText, { color: colors.foreground }]}>{todaySummary.guideAdvice}</Text>
              ) : null}
              {todaySummary.tomorrowPlan && todaySummary.tomorrowPlan.length > 0 && (
                <View style={{ marginTop: todaySummary.guideAdvice ? 10 : 0, gap: 6 }}>
                  {todaySummary.tomorrowPlan.map((item, i) => (
                    <View key={i} style={styles.planRow}>
                      <View style={[styles.planBullet, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.highlightText, { color: colors.foreground }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          {todaySummary.mood ? (
            <Text style={[styles.mood, { color: colors.mutedForeground, marginTop: 4 }]}>{todaySummary.mood}</Text>
          ) : null}
          <TouchableOpacity style={[styles.regenBtn, { borderColor: colors.border }]} onPress={handleGenerateWrap} disabled={generating}>
            <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
            <Text style={[styles.regenText, { color: colors.mutedForeground }]}>{generating ? 'Regenerating...' : 'Regenerate'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={handleGenerateWrap} disabled={generating} activeOpacity={0.8}>
          <Feather name="zap" size={16} color={colors.primary} />
          <Text style={[styles.generateText, { color: colors.primary }]}>{generating ? 'Generating AI summary...' : 'Generate Day Wrap'}</Text>
        </TouchableOpacity>
      )}
    </View>
  ) : null;

  // ─── WEB LAYOUT ──────────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.webGrid}>

          {/* Left column: scrollable log feed */}
          <ScrollView
            style={styles.webMainScrollArea}
            contentContainerStyle={styles.webMainContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          >
            {/* Header */}
            <View style={styles.webHeader}>
              <Text style={[styles.webHeaderTitle, { color: colors.foreground }]}>Today</Text>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
            </View>

            {/* Today's Log */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Log</Text>
                <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{todayEntries.length}</Text>
                </View>
              </View>

              {todayEntries.length === 0 ? (
                <View style={styles.webEmptyState}>
                  <Text style={[styles.webEmptyTime, { color: colors.primary }]}>
                    {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Text>
                  <Text style={[styles.webEmptyDayLabel, { color: colors.mutedForeground }]}>
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                  <Text style={[styles.webEmptyPrompt, { color: colors.foreground }]}>
                    Your day starts here.
                  </Text>
                  <Text style={[styles.webEmptySubtext, { color: colors.mutedForeground }]}>
                    Log what you're focused on right now. One entry is all it takes to build momentum.
                  </Text>
                  <View style={styles.webEmptyActions}>
                    <TouchableOpacity
                      style={[styles.webEmptyPrimaryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push({ pathname: '/checkin', params: { mode: 'text' } } as any)}
                      activeOpacity={0.85}
                    >
                      <Feather name="edit-3" size={16} color="#fff" />
                      <Text style={styles.webEmptyPrimaryBtnText}>Log a block</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.webEmptySecondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                      onPress={() => router.push({ pathname: '/checkin', params: { mode: 'voice', autoStart: 'true' } } as any)}
                      activeOpacity={0.8}
                    >
                      <Feather name="mic" size={16} color={colors.primary} />
                      <Text style={[styles.webEmptySecondaryBtnText, { color: colors.primary }]}>Voice entry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.timeline}>
                  {todayEntries.map(entry => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </View>
              )}
            </View>

            {dayWrapContent}
          </ScrollView>

          {/* Right column: sticky widget panel */}
          <View style={[styles.webRightCol, { borderLeftColor: colors.border }]}>

            {/* Focus Score */}
            <View style={[styles.webWidget, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.webWidgetLabel, { color: colors.mutedForeground }]}>FOCUS SCORE</Text>
                {deltaScore !== null && (
                  <View style={[styles.deltaBadge, { backgroundColor: deltaScore >= 0 ? '#10B98115' : '#EF444415' }]}>
                    <Feather name={deltaScore >= 0 ? 'trending-up' : 'trending-down'} size={12} color={deltaScore >= 0 ? '#10B981' : '#EF4444'} />
                    <Text style={[styles.deltaText, { color: deltaScore >= 0 ? '#10B981' : '#EF4444' }]}>
                      {deltaScore >= 0 ? '+' : ''}{deltaScore} today
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.webScoreNum, { color: colors.primary }]}>{focusScore}</Text>
              <Text style={[styles.webScoreSub, { color: colors.mutedForeground }]}>
                {focusScore >= 70
                  ? 'Excellent momentum — keeping deep work high.'
                  : focusScore >= 40
                  ? 'Steady pace. Log more blocks to build momentum.'
                  : 'Day is early. Complete a focus block to rise.'}
              </Text>
            </View>

            {/* Next Check-in */}
            <View style={[styles.webWidget, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.webWidgetLabel, { color: colors.mutedForeground }]}>NEXT CHECK-IN</Text>
              <CountdownTimer hideLabel />
            </View>

            {/* Motivation */}
            <View style={[styles.webMotivationWidget, { backgroundColor: motivationMessage.color + '10', borderColor: motivationMessage.color + '30' }]}>
              <Feather name={motivationMessage.icon as any} size={14} color={motivationMessage.color} />
              <Text style={[styles.motivationText, { color: motivationMessage.color, flex: 1, textAlign: 'left' }]}>
                {motivationMessage.text}
              </Text>
            </View>

            {/* Quick Log */}
            <View style={styles.webQuickSection}>
              <Text style={[styles.webWidgetLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>QUICK LOG</Text>
              <TouchableOpacity
                style={[styles.webQuickBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => router.push({ pathname: '/checkin', params: { mode: 'voice', autoStart: 'true' } } as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.webQuickIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Feather name="mic" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.webQuickBtnTitle, { color: colors.foreground }]}>Voice entry</Text>
                  <Text style={[styles.webQuickBtnSub, { color: colors.mutedForeground }]}>Dictate what you did</Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.webQuickBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => router.push({ pathname: '/checkin', params: { mode: 'text' } } as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.webQuickIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.webQuickBtnTitle, { color: colors.foreground }]}>Text entry</Text>
                  <Text style={[styles.webQuickBtnSub, { color: colors.mutedForeground }]}>Type your log</Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleBlock}>
              <Text style={[styles.appName, { color: colors.primary }]}>DaySync</Text>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
            <Feather name="settings" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Score + Countdown card */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>FOCUS SCORE</Text>
              <View style={styles.scoreNumberRow}>
                <Text style={[styles.scoreNum, { color: colors.primary }]}>{focusScore}</Text>
                {deltaScore !== null && (
                  <View style={[styles.deltaBadge, { backgroundColor: deltaScore >= 0 ? '#10B98115' : '#EF444415' }]}>
                    <Feather name={deltaScore >= 0 ? 'trending-up' : 'trending-down'} size={12} color={deltaScore >= 0 ? '#10B981' : '#EF4444'} />
                    <Text style={[styles.deltaText, { color: deltaScore >= 0 ? '#10B981' : '#EF4444' }]}>
                      {deltaScore >= 0 ? '+' : ''}{deltaScore}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.timerBlock}>
              <CountdownTimer />
            </View>
          </View>
          <View style={[styles.motivationFooter, { backgroundColor: motivationMessage.color + '12', borderTopColor: motivationMessage.color + '28', borderTopWidth: 1 }]}>
            <Feather name={motivationMessage.icon as any} size={14} color={motivationMessage.color} />
            <Text style={[styles.motivationText, { color: motivationMessage.color }]}>{motivationMessage.text}</Text>
          </View>
        </View>

        {/* Log Now CTA */}
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
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Log</Text>
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{todayEntries.length}</Text>
            </View>
          </View>
          {todayEntries.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sun" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No entries yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap "Log Now" to start building your day's timeline.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {todayEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </View>
          )}
        </View>

        {dayWrapContent}
      </ScrollView>

      {/* FAB */}
      <View style={[styles.fab, { bottom: insets.bottom + 20, right: 24 }]}>
        <>
          <Animated.View style={miniFabTextStyle} pointerEvents={fabOpen ? 'auto' : 'none'}>
            <TouchableOpacity
              style={[styles.miniFab, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}; toggleFab(); router.push({ pathname: '/checkin', params: { mode: 'text' } }); }}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={miniFabVoiceStyle} pointerEvents={fabOpen ? 'auto' : 'none'}>
            <TouchableOpacity
              style={[styles.miniFab, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}; toggleFab(); router.push({ pathname: '/checkin', params: { mode: 'voice', autoStart: 'true' } }); }}
              activeOpacity={0.8}
            >
              <Feather name="mic" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </Animated.View>
        </>
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: colors.primary }]}
          onPress={toggleFab}
          activeOpacity={0.85}
        >
          <Animated.View style={fabPlusStyle}>
            <Feather name="plus" size={26} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Mobile scroll ──
  scroll: { paddingHorizontal: 20, gap: 16 },

  // ── Web two-column grid ──
  webGrid: { flex: 1, flexDirection: 'row' },
  webMainScrollArea: { flex: 1 },
  webMainContent: {
    paddingHorizontal: 56,
    paddingTop: 44,
    paddingBottom: 80,
    gap: 32,
    maxWidth: 1150,
    width: '100%',
  },
  webHeader: { gap: 4 },
  webHeaderTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },

  // Web right panel (expanded executive width + rich editorial hierarchy)
  webRightCol: {
    width: 460,
    borderLeftWidth: 1,
    padding: 36,
    gap: 24,
    // sticky on web via flex
  },
  webWidget: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 26,
    gap: 14,
  },
  webWidgetLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  webScoreNum: {
    fontSize: 64,
    fontFamily: 'Inter_700Bold',
    lineHeight: 64,
    letterSpacing: -2.5,
    marginVertical: 4,
  },
  webScoreSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  webMotivationWidget: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webQuickSection: { gap: 12 },
  webQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  webQuickIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webQuickBtnTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  webQuickBtnSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },

  // Web empty state — large hero
  webEmptyState: {
    alignItems: 'center',
    paddingVertical: 72,
    gap: 10,
  },
  webEmptyTime: {
    fontSize: 68,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -3,
    lineHeight: 68,
  },
  webEmptyDayLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  webEmptyPrompt: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginTop: 28,
    textAlign: 'center',
  },
  webEmptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 360,
  },
  webEmptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  webEmptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  webEmptyPrimaryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  webEmptySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  webEmptySecondaryBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  // ── Shared ──
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  settingsBtn: { padding: 8 },
  titleBlock: { flexShrink: 1 },
  appName: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  date: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statsCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  statsRow: { flexDirection: 'row', padding: 24, alignItems: 'center', justifyContent: 'center' },
  motivationFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 8 },
  motivationText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  scoreBlock: { flex: 1, alignItems: 'center', gap: 2, paddingRight: 16 },
  timerBlock: { flex: 1, alignItems: 'center', paddingLeft: 16 },
  divider: { width: 1.5, height: 56 },
  scoreNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreNum: { fontSize: 48, fontFamily: 'Inter_700Bold', lineHeight: 48, letterSpacing: -2 },
  deltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  deltaText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  scoreLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  logButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 100 },
  logButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  badgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  timeline: { gap: 0 },
  emptyState: { alignItems: 'center', gap: 8, padding: 28, borderRadius: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  wrapCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  wrapSummary: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 23, marginBottom: 4 },
  wrapSection: { gap: 6, marginTop: 8 },
  wrapSectionLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.1, textTransform: 'uppercase', opacity: 0.9 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  highlight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  highlightIcon: { marginTop: 1 },
  highlightText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  planBullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  adviceCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6, marginTop: 10 },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adviceTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  adviceText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19 },
  mood: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  regenBtn: { alignSelf: 'flex-end', borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  regenText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  generateText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  fab: { position: 'absolute', alignItems: 'center', gap: 12 },
  fabBtn: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  miniFab: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});

