import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface OverviewHeaderProps {
  todayScore: number;
  yesterdayScore: number;
  wasteDelta: number;
  hasYesterdayData: boolean;
  hasTodayData: boolean;
}

/**
 * Renders the Versus score comparison and Leak Trajectory warnings.
 * Completely stateless, relying entirely on pre-calculated props.
 */
export const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  todayScore,
  yesterdayScore,
  wasteDelta,
  hasYesterdayData,
  hasTodayData,
}) => {
  const colors = useColors();
  
  // Safe numbers fallback for Android rendering safety
  const safeToday = isNaN(todayScore) ? 0 : todayScore;
  const safeYesterday = isNaN(yesterdayScore) ? 0 : yesterdayScore;

  return (
    <View style={styles.container}>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Versus</Text>
      
      {/* You vs You Delta */}
      <View style={styles.versusRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bigNum, { color: colors.mutedForeground }]}>{safeYesterday}</Text>
          <Text style={[styles.bigLabel, { color: colors.mutedForeground }]}>Yesterday</Text>
        </View>
        
        <View style={[styles.vsBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bigNum, { color: colors.foreground }]}>{safeToday}</Text>
          <Text style={[styles.bigLabel, { color: colors.primary }]}>Today</Text>
        </View>
      </View>

      {/* Time Waste Trajectory Warning */}
      {(hasYesterdayData && hasTodayData && wasteDelta > 0) && (
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
      
      {(hasYesterdayData && hasTodayData && wasteDelta < 0) && (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1, marginBottom: 12 },
  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 8,
    position: 'relative',
  },
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
});
