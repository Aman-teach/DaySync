import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface OverviewHeaderProps {
  todayScore: number;
  yesterdayScore: number;
  wasteDelta: number;     // today distracted mins − yesterday distracted mins (negative = improved)
  hasYesterdayData: boolean;
  hasTodayData: boolean;
}

/**
 * Versus section: shows today vs yesterday focus score with a smart contextual insight card.
 * "Leak" terminology replaced with plain language about distracted time.
 */
export const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  todayScore,
  yesterdayScore,
  wasteDelta,
  hasYesterdayData,
  hasTodayData,
}) => {
  const colors = useColors();

  const safeToday     = isNaN(todayScore)     ? 0 : todayScore;
  const safeYesterday = isNaN(yesterdayScore) ? 0 : yesterdayScore;
  const scoreDiff     = safeToday - safeYesterday;
  const hasComparison = hasYesterdayData && hasTodayData;

  // Build a smart insight object based on score + distracted time deltas
  const insight = React.useMemo(() => {
    if (!hasComparison) return null;

    // Score improved, distracted time improved
    if (scoreDiff > 0 && wasteDelta < 0) {
      const savedMin = Math.abs(wasteDelta);
      return {
        icon: 'trending-up' as const,
        bg: '#10B98112',
        border: '#10B98130',
        labelColor: '#10B981',
        label: 'IMPROVING',
        text: `+${scoreDiff} pts and ${savedMin}m less distracted than yesterday. You're trending up.`,
        highlight: `+${scoreDiff} pts`,
        highlightColor: '#10B981',
      };
    }

    // Score improved, distracted time same or worse
    if (scoreDiff > 0) {
      return {
        icon: 'arrow-up-right' as const,
        bg: '#3B82F612',
        border: '#3B82F630',
        labelColor: '#3B82F6',
        label: 'SCORE UP',
        text: `Focus score is up ${scoreDiff} pts from yesterday.${wasteDelta > 0 ? ` Still ${wasteDelta}m more distracted time though — keep tightening.` : ''}`,
        highlight: `+${scoreDiff} pts`,
        highlightColor: '#3B82F6',
      };
    }

    // Score dropped, distracted time got worse
    if (scoreDiff < 0 && wasteDelta > 0) {
      return {
        icon: 'alert-triangle' as const,
        bg: '#EF444412',
        border: '#EF444430',
        labelColor: '#EF4444',
        label: 'SLIPPING',
        text: `Down ${Math.abs(scoreDiff)} pts. You also logged ${wasteDelta}m more distracted time. Two things to fix tomorrow.`,
        highlight: `−${Math.abs(scoreDiff)} pts`,
        highlightColor: '#EF4444',
      };
    }

    // Score dropped but distracted time improved
    if (scoreDiff < 0) {
      return {
        icon: 'minus-circle' as const,
        bg: '#F59E0B12',
        border: '#F59E0B30',
        labelColor: '#F59E0B',
        label: 'LOWER OUTPUT',
        text: `Score dropped ${Math.abs(scoreDiff)} pts but you kept distracted time lower than yesterday. Output dipped, discipline held.`,
        highlight: `−${Math.abs(scoreDiff)} pts`,
        highlightColor: '#F59E0B',
      };
    }

    // No change
    return {
      icon: 'minus' as const,
      bg: colors.muted,
      border: colors.border,
      labelColor: colors.mutedForeground,
      label: 'SAME AS YESTERDAY',
      text: `Identical score to yesterday. Consistent is fine — but is there something you could push harder on?`,
      highlight: null,
      highlightColor: colors.foreground,
    };
  }, [hasComparison, scoreDiff, wasteDelta]);

  return (
    <View style={styles.container}>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Versus</Text>

      {/* You vs You Score Cards */}
      <View style={styles.versusRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bigNum, { color: colors.mutedForeground }]}>{safeYesterday}</Text>
          <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Yesterday</Text>
        </View>

        {/* Center delta indicator */}
        <View style={styles.centerCol}>
          <View style={[styles.vsBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>
          </View>
          {hasComparison && scoreDiff !== 0 && (
            <View style={[
              styles.deltaPill,
              { backgroundColor: scoreDiff > 0 ? '#10B98118' : '#EF444418' }
            ]}>
              <Feather
                name={scoreDiff > 0 ? 'arrow-up' : 'arrow-down'}
                size={10}
                color={scoreDiff > 0 ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.deltaNum, { color: scoreDiff > 0 ? '#10B981' : '#EF4444' }]}>
                {Math.abs(scoreDiff)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bigNum, { color: scoreDiff >= 0 ? '#10B981' : '#EF4444' }]}>{safeToday}</Text>
          <Text style={[styles.bigLabel, { color: colors.primary }]}>Today</Text>
        </View>
      </View>

      {/* Smart Insight Card */}
      {insight && (
        <View style={[styles.insightCard, { backgroundColor: insight.bg, borderColor: insight.border }]}>
          <View style={styles.insightHeader}>
            <Feather name={insight.icon} size={13} color={insight.labelColor} />
            <Text style={[styles.insightLabel, { color: insight.labelColor }]}>{insight.label}</Text>
          </View>
          <Text style={[styles.insightText, { color: colors.foreground }]}>
            {insight.text}
          </Text>
        </View>
      )}

      {/* What is this score? helper */}
      <View style={[styles.scoreExplainer, { backgroundColor: colors.muted }]}>
        <Feather name="info" size={11} color={colors.mutedForeground} />
        <Text style={[styles.explainerText, { color: colors.mutedForeground }]}>
          Score = deep work time minus idle/distracted gaps, capped at 100. Decays if you go silent for 1.5h+.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', gap: 12 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },

  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    padding: 18, alignItems: 'center', gap: 4,
  },
  bigNum: { fontSize: 38, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  bigLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  centerCol: { alignItems: 'center', gap: 6 },
  vsBadge: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  vsText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold' },
  deltaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 100,
  },
  deltaNum: { fontSize: 11, fontFamily: 'Inter_700Bold' },

  insightCard: {
    padding: 14, borderRadius: 14, borderWidth: 1, gap: 6,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  insightText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  scoreExplainer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    padding: 10, borderRadius: 10,
  },
  explainerText: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
});
