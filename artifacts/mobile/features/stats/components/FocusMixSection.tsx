import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  deepRate: number; // calculated as Math.round((allDeep / allTotal) * 100)
}

/**
 * Focus Mix Ring completely decoupled from data aggregation.
 * Takes explicit pre-calculated data props.
 */
export const FocusMixSection: React.FC<FocusMixSectionProps> = React.memo(({
  ringSegments,
  allTotal,
  streak,
  deepRate,
}) => {
  const colors = useColors();

  // Defensive rendering against NaN
  const safeStreak = isNaN(streak) ? 0 : streak;
  const safeRate = isNaN(deepRate) ? 0 : deepRate;
  const safeTotal = isNaN(allTotal) ? 0 : allTotal;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Mix</Text>
        <StatsRing
          segments={ringSegments}
          centerLabel={`${safeTotal}`}
          centerSub="blocks"
        />
      </View>

      <View style={styles.row2}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bigNum, { color: colors.primary }]}>{safeStreak}</Text>
          <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bigNum, { color: colors.primary }]}>
            {safeRate}%
          </Text>
          <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Deep Rate</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 14, marginVertical: 8 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
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
});
