import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { TowerBlock, MiniTowerBlock } from '@/components/TowerBlock';
import { Feather } from '@expo/vector-icons';
import {
  getDateKey,
  getEntriesForDate,
  getLast7DayKeys,
  getFocusScore,
  getConsecutiveDayStreak,
} from '@/utils/helpers';
import { Entry } from '@/types';

// ─── Mini tower for history strip ──────────────────────────────────────────
function MiniTower({ entries, interval }: { entries: Entry[]; interval: number }) {
  const colors = useColors();
  if (entries.length === 0) {
    return (
      <View style={[miniStyles.emptyTower, { borderColor: colors.border }]}>
        <View style={[miniStyles.emptyDash, { backgroundColor: colors.border }]} />
      </View>
    );
  }
  return (
    <View style={miniStyles.miniTower}>
      {[...entries].reverse().map((e, i) => (
        <MiniTowerBlock key={i} focus={e.focus} />
      ))}
    </View>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  accent: string;
}) {
  const colors = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: accent + '22' }]}>
        <Feather name={icon} size={14} color={accent} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function TowerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { todayEntries, entries, settings } = useApp();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const todayKey = getDateKey(new Date(), settings.dayStartHour);
  const displayKey = selectedKey ?? todayKey;
  const displayEntries = displayKey === todayKey
    ? todayEntries
    : getEntriesForDate(entries, displayKey);

  const deepCount  = displayEntries.filter(e => e.focus === 'deep').length;
  const lightCount = displayEntries.filter(e => e.focus === 'light').length;
  const neutralCount = displayEntries.filter(e => e.focus === 'neutral').length;
  const offCount   = displayEntries.filter(e => e.focus === 'off').length;
  const streak     = getConsecutiveDayStreak(entries, settings.dayStartHour);
  const focusScore = getFocusScore(displayEntries);

  const deepMin  = displayEntries.filter(e => e.focus === 'deep').reduce((s, e) => s + (e.intervalMinutes ?? settings.interval), 0);
  const lightMin = displayEntries.filter(e => e.focus === 'light').reduce((s, e) => s + (e.intervalMinutes ?? settings.interval), 0);
  const neutralMin = displayEntries.filter(e => e.focus === 'neutral').reduce((s, e) => s + (e.intervalMinutes ?? settings.interval), 0);
  const offMin   = displayEntries.filter(e => e.focus === 'off').reduce((s, e) => s + (e.intervalMinutes ?? settings.interval), 0);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const last7 = getLast7DayKeys(settings.dayStartHour);

  const isToday = displayKey === todayKey;
  const displayLabel = isToday
    ? 'Today'
    : new Date(displayKey).toLocaleDateString('default', { month: 'short', day: 'numeric' });

  // Block count drives tower "height feeling"
  const blockCount = displayEntries.length;

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
        {/* ── Header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Tower</Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              {isToday ? 'Your focus today' : displayLabel}
            </Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={12} color="#fff" />
            <Text style={styles.scoreBadgeText}>{focusScore}</Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsStrip}>
          <StatCard icon="award" label="Streak"      value={`${streak}d`}      accent={colors.primary} />
          <StatCard icon="zap"   label="Deep Focus"  value={deepMin >= 60 ? `${Math.floor(deepMin / 60)}h ${deepMin % 60}m` : `${deepMin}m`} accent="#52B788" />
          <StatCard icon="sun"   label="Light Focus" value={`${lightMin}m`}    accent="#E9C46A" />
          <StatCard icon="coffee" label="Neutral"    value={`${neutralMin}m`}  accent="#9CA3AF" />
          <StatCard icon="moon"  label="Off"         value={`${offMin}m`}      accent="#6B7280" />
          <StatCard icon="layers" label="Blocks"     value={`${blockCount}`}   accent="#A78BFA" />
        </View>

        {/* ── Tower visualization ── */}
        <View style={[styles.towerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Sky gradient background */}
          <LinearGradient
            colors={['#0F172A', '#1E293B', '#2D3748']}
            style={styles.towerSky}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Stars */}
            {[...Array(16)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  {
                    top: `${5 + (i * 37) % 55}%` as any,
                    left: `${(i * 19 + 5) % 90}%` as any,
                    opacity: 0.3 + (i % 3) * 0.2,
                    width: i % 4 === 0 ? 2 : 1,
                    height: i % 4 === 0 ? 2 : 1,
                  },
                ]}
              />
            ))}

            {/* Tower column */}
            <View style={styles.towerCol}>
              {displayEntries.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: '#ffffff10' }]}>
                    <Feather name="layers" size={28} color="#ffffff44" />
                  </View>
                  <Text style={styles.emptyTitle}>No blocks yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Log your first entry to start building
                  </Text>
                </View>
              ) : (
                <View style={styles.blocksStack}>
                  {[...displayEntries].reverse().map((entry, i) => (
                    <TowerBlock
                      key={entry.id}
                      focus={entry.focus}
                      intervalMinutes={entry.intervalMinutes ?? settings.interval}
                      animate={isToday}
                      index={i}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Ground platform */}
            <View style={styles.ground}>
              <LinearGradient
                colors={['#4ADE80', '#16A34A', '#166534']}
                style={styles.groundTop}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.groundFront} />
            </View>
          </LinearGradient>

          {/* Date label + block count overlay */}
          <View style={styles.towerOverlay}>
            <View style={[styles.dateBadge, { backgroundColor: colors.background + 'dd' }]}>
              <Feather name="calendar" size={10} color={colors.mutedForeground} />
              <Text style={[styles.dateBadgeText, { color: colors.foreground }]}>
                {displayLabel}
              </Text>
            </View>
            {blockCount > 0 && (
              <View style={[styles.blockCountBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.blockCountText}>{blockCount} blocks</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Legend ── */}
        <View style={[styles.legendCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { front: '#2D6A4F', top: '#52B788', label: 'Deep Focus', desc: 'Fully concentrated' },
            { front: '#C49A3C', top: '#E9C46A', label: 'Light Focus', desc: 'Casual/productive' },
            { front: '#4B5563', top: '#6B7280', label: 'Off',         desc: 'Distracted/resting' },
          ].map(item => (
            <View key={item.label} style={styles.legendItem}>
              {/* Mini 3D block preview */}
              <View style={styles.legendBlockWrap}>
                <View style={[styles.legendBlockTop,   { backgroundColor: item.top }]} />
                <View style={[styles.legendBlockFront, { backgroundColor: item.front }]} />
                <View style={[styles.legendBlockSide,  { backgroundColor: item.front, opacity: 0.5 }]} />
              </View>
              <View style={styles.legendText}>
                <Text style={[styles.legendLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.legendDesc,  { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 7-day history ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Last 7 Days</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyStrip}
          >
            {last7.slice().reverse().map(key => {
              const dayEntries = getEntriesForDate(entries, key);
              const isSelected = key === displayKey;
              const hasData = dayEntries.length > 0;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedKey(key === todayKey ? null : key)}
                  style={[
                    styles.miniCard,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected
                        ? colors.primary + '15'
                        : hasData
                        ? colors.card
                        : colors.background,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <MiniTower entries={dayEntries} interval={settings.interval} />
                  <Text style={[styles.miniLabel, {
                    color: isSelected ? colors.primary : colors.mutedForeground,
                    fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_400Regular',
                  }]}>
                    {key.slice(5)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },

  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle:    { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  scoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  scoreBadgeText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },

  statsStrip: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8, 
    paddingBottom: 4 
  },

  // Tower card
  towerCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 340,
    position: 'relative',
  },
  towerSky: {
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingTop: 50,
    position: 'relative',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  towerCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
    width: '100%',
    paddingHorizontal: 20,
  },
  blocksStack: {
    alignItems: 'flex-start',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 20,
  },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle:    { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#ffffff88' },
  emptySubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#ffffff44', textAlign: 'center' },
  
  // Ground platform — 184px to cover BRICK_W(160) + SIDE_W(12) + padding
  ground: { width: 184, zIndex: 1 },
  groundTop: {
    height: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  groundFront: {
    height: 8,
    backgroundColor: '#166534',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },

  // Overlay badges
  towerOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 100,
  },
  dateBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  blockCountBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  blockCountText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },

  // Legend
  legendCard: {
    borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendBlockWrap: {
    width: 28, height: 22,
    position: 'relative',
  },
  legendBlockTop: {
    position: 'absolute', top: 0, left: 0, right: 4, height: 5, borderRadius: 2,
  },
  legendBlockFront: {
    position: 'absolute', top: 5, left: 0, right: 4, height: 14, borderRadius: 2,
  },
  legendBlockSide: {
    position: 'absolute', top: 5, right: 0, width: 5, height: 14, borderRadius: 2,
  },
  legendText: { gap: 1 },
  legendLabel: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  legendDesc:  { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // 30-day history
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  historyStrip: { gap: 6, paddingBottom: 4 },
  miniCard: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 38,
    gap: 6,
    justifyContent: 'flex-end',
    minHeight: 80,
  },
  miniLabel: { fontSize: 8, letterSpacing: 0.2 },
});

// ─── Stat card styles ───────────────────────────────────────────────────────
const statStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    minWidth: 80,
    flexGrow: 1,
    gap: 4,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  value: { fontSize: 17, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  label: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
});

// ─── Mini tower styles ──────────────────────────────────────────────────────
const miniStyles = StyleSheet.create({
  miniTower: { justifyContent: 'flex-end', gap: 1.5 },
  emptyTower: {
    width: 20, height: 30,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, borderWidth: 1, borderStyle: 'dashed',
  },
  emptyDash: { width: 8, height: 1.5, borderRadius: 1 },
});
