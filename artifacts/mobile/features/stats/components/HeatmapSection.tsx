import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { HeatmapCalendar, HEATMAP_COLORS } from '@/components/HeatmapCalendar';

interface HeatmapSectionProps {
  heatmapData: Record<string, number>;
  dayStartHour?: number;
}

/**
 * 60-Day GitHub-style Focus Heatmap card.
 * Shows active focus days count, clean month headers, and intensity legend.
 */
export const HeatmapSection: React.FC<HeatmapSectionProps> = React.memo(({ heatmapData, dayStartHour = 4 }) => {
  const colors = useColors();

  // Count active focus days in the heatmap window
  const activeDaysCount = React.useMemo(() => {
    return Object.values(heatmapData).filter(score => score > 0).length;
  }, [heatmapData]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row with title and active days counter badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Heatmap</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Last 60 days activity</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>{activeDaysCount} active days</Text>
        </View>
      </View>

      {/* GitHub-style Heatmap Calendar */}
      <View style={styles.heatmapWrapper}>
        <HeatmapCalendar data={heatmapData} weeks={9} dayStartHour={dayStartHour} />
      </View>

      {/* Legend footer */}
      <View style={styles.heatmapLegend}>
        <Text style={[styles.heatLegendText, { color: colors.mutedForeground }]}>Less</Text>
        <View style={[styles.heatCell, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]} />
        {HEATMAP_COLORS.map(c => (
          <View key={c} style={[styles.heatCell, { backgroundColor: c }]} />
        ))}
        <Text style={[styles.heatLegendText, { color: colors.mutedForeground }]}>More</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleCol: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  cardSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  heatmapWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  heatCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  heatLegendText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
});
