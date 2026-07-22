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
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { TowerBlock } from '@/components/TowerBlock';
import { Feather } from '@expo/vector-icons';
import {
  getDateKey,
  getEntriesForDate,
  getLast30DayKeys,
  getFocusScore,
  getConsecutiveDayStreak,
} from '@/utils/helpers';
import { Entry } from '@/types';

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function MiniTower({ entries, interval }: { entries: Entry[]; interval: number }) {
  const colors = useColors();
  if (entries.length === 0) {
    return (
      <View style={[styles.miniTowerEmpty, { borderColor: colors.border }]} />
    );
  }
  return (
    <View style={styles.miniTower}>
      {[...entries].reverse().map((e, i) => (
        <TowerBlock key={i} focus={e.focus} intervalMinutes={interval} mini />
      ))}
    </View>
  );
}

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

  const deepCount = displayEntries.filter(e => e.focus === 'deep').length;
  const lightCount = displayEntries.filter(e => e.focus === 'light').length;
  const offCount = displayEntries.filter(e => e.focus === 'off').length;
  const streak = getConsecutiveDayStreak(entries, settings.dayStartHour);
  const focusScore = getFocusScore(displayEntries);

  const deepMin = deepCount * settings.interval;
  const lightMin = lightCount * settings.interval;
  const offMin = offCount * settings.interval;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const last30 = getLast30DayKeys(settings.dayStartHour);

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
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Tower</Text>
          <View style={[styles.scoreBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}>
            <Text style={[styles.scoreBadgeText, { color: colors.primary }]}>Score {focusScore}</Text>
          </View>
        </View>

        {/* Stats strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsStrip}>
          <View style={styles.statsRow}>
            <StatPill label="Streak" value={`${streak}d`} color={colors.primary} />
            <StatPill
              label="Deep"
              value={deepMin >= 60 ? `${Math.floor(deepMin / 60)}h ${deepMin % 60}m` : `${deepMin}m`}
              color="#2D6A4F"
            />
            <StatPill
              label="Light"
              value={`${lightMin}m`}
              color="#E8A838"
            />
            <StatPill
              label="Off"
              value={`${offMin}m`}
              color="#9CA3AF"
            />
            <StatPill label="Blocks" value={`${displayEntries.length}`} color={colors.foreground} />
          </View>
        </ScrollView>

        {/* Tower visualization */}
        <View style={[styles.towerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.towerDateLabel, { color: colors.mutedForeground }]}>
            {displayKey === todayKey ? 'Today' : displayKey}
          </Text>

          {displayEntries.length === 0 ? (
            <View style={styles.towerEmpty}>
              <Feather name="layers" size={32} color={colors.mutedForeground} />
              <Text style={[styles.towerEmptyText, { color: colors.mutedForeground }]}>
                No blocks yet — start logging to build your tower
              </Text>
            </View>
          ) : (
            <View style={styles.tower}>
              {/* Ground */}
              <View style={[styles.ground, { backgroundColor: colors.secondary }]} />
              {/* Blocks - reversed (bottom = first entry) */}
              <View style={styles.blocksCol}>
                {[...displayEntries].reverse().map((entry, i) => (
                  <TowerBlock
                    key={entry.id}
                    focus={entry.focus}
                    intervalMinutes={settings.interval}
                    animate={i === 0 && displayKey === todayKey}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: '#1B4332', label: 'Deep Focus' },
            { color: '#8B5E3C', label: 'Light Focus' },
            { color: '#5C3535', label: 'Off / Distracted' },
          ].map(item => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 30-day history */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Last 30 Days
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyStrip}
          >
            {last30.map(key => {
              const dayEntries = getEntriesForDate(entries, key);
              const isSelected = key === displayKey;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedKey(key === todayKey ? null : key)}
                  style={[
                    styles.miniTowerWrapper,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary + '10' : colors.card,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <MiniTower entries={dayEntries} interval={settings.interval} />
                  <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  scoreBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  statsStrip: { marginHorizontal: -20 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 4 },
  statPill: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 70,
  },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 1 },
  towerContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    minHeight: 220,
    alignItems: 'center',
    gap: 12,
  },
  towerDateLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', alignSelf: 'flex-start' },
  towerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  towerEmptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, maxWidth: 240 },
  tower: { width: '80%', alignItems: 'stretch', gap: 0 },
  ground: { height: 8, borderRadius: 4, marginBottom: 0 },
  blocksCol: { gap: 0 },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  historyStrip: { gap: 6, paddingBottom: 4 },
  miniTowerWrapper: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 28,
    gap: 4,
    justifyContent: 'flex-end',
    minHeight: 70,
  },
  miniTower: { justifyContent: 'flex-end', gap: 1 },
  miniTowerEmpty: { height: 20, width: 14, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed' },
  miniLabel: { fontSize: 8, fontFamily: 'Inter_500Medium' },
});
