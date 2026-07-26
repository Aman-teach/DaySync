import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { formatHour } from '@/utils/helpers'; // Safe pure helper for "12PM" etc

interface DeepWorkHistogramProps {
  hourlyData: number[];
  maxDeepByHour: number;
  activeStart: number;
  activeEnd: number;
}

/**
 * 24-hour histogram. Stateless component focusing purely on rendering height ratios.
 */
export const DeepWorkHistogram: React.FC<DeepWorkHistogramProps> = React.memo(({
  hourlyData,
  maxDeepByHour,
  activeStart,
  activeEnd,
}) => {
  const colors = useColors();

  if (!hourlyData || hourlyData.length === 0) return null;

  // Protect from NaN ratios on empty days
  const safeMax = isNaN(maxDeepByHour) || maxDeepByHour <= 0 ? 1 : maxDeepByHour;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Deep Work by Hour</Text>
      <View style={styles.hourChart}>
        {hourlyData.map((count, h) => {
          const ratio = count / safeMax;
          const barH = Math.max(2, ratio * 60);
          
          // Determine if it's within user's core hours
          const isActive = h >= activeStart && h < activeEnd;
          
          return (
            <View key={h} style={styles.hourCol}>
              <View
                style={[
                  styles.hourBar,
                  {
                    height: isNaN(barH) ? 2 : barH,
                    backgroundColor: count > 0 ? colors.primary : colors.muted,
                    opacity: isActive ? 1 : 0.4,
                  },
                ]}
              />
              {(h % 4 === 0) && (
                <Text style={[styles.hourLabel, { color: colors.mutedForeground }]}>
                  {formatHour(h)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14, marginVertical: 8 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  hourChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 80,
  },
  hourCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  hourBar: { width: '100%', borderRadius: 2 },
  hourLabel: { fontSize: 8, fontFamily: 'Inter_500Medium' },
});
