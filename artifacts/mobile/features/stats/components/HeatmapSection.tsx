import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { HeatmapCalendar } from '@/components/HeatmapCalendar';

interface HeatmapSectionProps {
  heatmapData: Record<string, number>;
}

/**
 * Wrapper for the HeatmapCalendar.
 * Completely stateless. Only provides layout, titles, and legends.
 */
export const HeatmapSection: React.FC<HeatmapSectionProps> = React.memo(({ heatmapData }) => {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Heatmap</Text>
      <View style={styles.heatmapWrapper}>
        <HeatmapCalendar data={heatmapData} weeks={16} />
      </View>
      <View style={styles.heatmapLegend}>
        <Text style={[styles.heatLegendText, { color: colors.mutedForeground }]}>Less</Text>
        {['#B7E4C7', '#74C69D', '#40916C', '#1B4332'].map(c => (
          <View key={c} style={[styles.heatCell, { backgroundColor: c }]} />
        ))}
        <Text style={[styles.heatLegendText, { color: colors.mutedForeground }]}>More</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14, marginVertical: 8 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  heatmapWrapper: { paddingLeft: 20, overflow: 'hidden' },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  heatCell: { width: 10, height: 10, borderRadius: 2 },
  heatLegendText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});
