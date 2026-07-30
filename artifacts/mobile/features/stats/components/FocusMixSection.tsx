import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatsRing } from '@/components/StatsRing';
import { useColors } from '@/hooks/useColors';

interface RingSegment {
  value: number;
  color: string;
  label: string;
}

interface FocusMixSectionProps {
  ringSegments: RingSegment[];
  allTotal: number;
  streak: number;
  deepRate: number;
}

// Maps segment label → icon + description
const FOCUS_META: Record<string, { icon: string; desc: string }> = {
  Deep:       { icon: 'zap',           desc: 'Full concentration' },
  Normal:     { icon: 'sun',           desc: 'Productive flow' },
  Neutral:    { icon: 'coffee',        desc: 'Low-intensity work' },
  Distracted: { icon: 'alert-circle',  desc: 'Off task / resting' },
};

/**
 * Focus Mix ring — updated for new focus system (deep/normal/neutral/distracted).
 * Accepts pre-calculated props from useStatsData, renders nothing on its own.
 */
export const FocusMixSection: React.FC<FocusMixSectionProps> = React.memo(({
  ringSegments,
  allTotal,
  streak,
  deepRate,
}) => {
  const colors = useColors();

  const safeStreak = isNaN(streak) ? 0 : streak;
  const safeRate   = isNaN(deepRate) ? 0 : deepRate;
  const safeTotal  = isNaN(allTotal) ? 0 : allTotal;

  // Pick center color from the dominant segment
  const dominant = [...ringSegments].sort((a, b) => b.value - a.value)[0];
  const centerColor = dominant?.color ?? colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Mix</Text>
          <View style={[styles.totalBadge, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.totalBadgeText, { color: colors.primary }]}>{safeTotal} blocks</Text>
          </View>
        </View>

        {/* Ring + breakdown side-by-side */}
        <View style={styles.bodyRow}>
          {/* Donut ring */}
          <StatsRing
            segments={ringSegments}
            size={148}
            strokeWidth={20}
            centerLabel={`${safeRate}%`}
            centerSub="deep"
            centerColor={centerColor}
          />

          {/* Segment breakdown list */}
          <View style={styles.breakdownCol}>
            {ringSegments.map((seg) => {
              const meta = FOCUS_META[seg.label] ?? { icon: 'circle', desc: '' };
              const pct = safeTotal > 0 ? Math.round((seg.value / safeTotal) * 100) : 0;
              return (
                <View key={seg.label} style={styles.breakdownRow}>
                  <View style={[styles.segIconWrap, { backgroundColor: seg.color + '18' }]}>
                    <Feather name={meta.icon as any} size={12} color={seg.color} />
                  </View>
                  <View style={styles.segTextCol}>
                    <View style={styles.segLabelRow}>
                      <Text style={[styles.segLabel, { color: colors.foreground }]}>{seg.label}</Text>
                      <Text style={[styles.segPct, { color: seg.color }]}>{pct}%</Text>
                    </View>
                    {/* Progress bar */}
                    <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
                      <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: seg.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
            {ringSegments.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data yet</Text>
            )}
          </View>
        </View>
      </View>

      {/* Stat cards row */}
      <View style={styles.row2}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.primary + '15' }]}>
            <Feather name="trending-up" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.bigNum, { color: colors.primary }]}>{safeStreak}</Text>
          <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#52B78815' }]}>
            <Feather name="zap" size={16} color="#52B788" />
          </View>
          <Text style={[styles.bigNum, { color: '#52B788' }]}>{safeRate}%</Text>
          <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Deep Rate</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 12, marginVertical: 8 },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  totalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  totalBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },

  breakdownCol: { flex: 1, gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segTextCol: { flex: 1, gap: 3 },
  segLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  segPct: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  row2: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 16,
    alignItems: 'center', gap: 6,
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bigNum: { fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  bigLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
