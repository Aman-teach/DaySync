import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { TagChip } from '@/components/TagChip';
import type { Timeframe } from '../hooks/useTimeframeData';

export interface AnalyticsDataItem {
  id: string;
  title: string;
  minutes: number;
  isTag?: boolean;
}

interface AnalyticsListProps {
  title: string;
  data: AnalyticsDataItem[];
  maxMinutes: number;
  timeframes: readonly Timeframe[];
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  emptyMessage?: string;
}

/**
 * Reusable list for displaying bar charts of categorical time (Tags or Tasks).
 * It receives normalized data to prevent duplicated rendering logic.
 */
export const AnalyticsList: React.FC<AnalyticsListProps> = React.memo(({
  title,
  data,
  maxMinutes,
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  emptyMessage = "No data logged for this timeframe."
}) => {
  const colors = useColors();
  
  // Safe denominator to prevent NaN
  const safeMax = isNaN(maxMinutes) || maxMinutes <= 0 ? 1 : maxMinutes;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <View style={[styles.timeframeToggle, { backgroundColor: colors.muted }]}>
          {timeframes.map(tf => (
            <TouchableOpacity
              key={tf}
              style={[
                styles.timeframeBtn, 
                selectedTimeframe === tf && { 
                  backgroundColor: colors.card, 
                  shadowColor: '#000', 
                  shadowOpacity: 0.1, 
                  shadowRadius: 2, 
                  shadowOffset: { width: 0, height: 1 } 
                }
              ]}
              onPress={() => onTimeframeChange(tf)}
              accessibilityRole="button"
            >
              <Text style={[
                styles.timeframeText, 
                { color: selectedTimeframe === tf ? colors.foreground : colors.mutedForeground }
              ]}>
                {tf === 'week' ? '7 Days' : (tf === 'all' ? 'All' : tf.charAt(0).toUpperCase() + tf.slice(1))}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {data.length > 0 ? (
        <View style={styles.listContainer}>
          {data.map((item) => {
            const pct = item.minutes / safeMax;
            const hours = Math.floor(item.minutes / 60);
            const minsRem = item.minutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${minsRem}m` : `${minsRem}m`;
            
            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowHeader}>
                  {item.isTag ? (
                    <TagChip tagId={item.id} size="sm" />
                  ) : (
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                  )}
                  <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{timeStr}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(isNaN(pct) ? 0 : pct) * 100}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {emptyMessage}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14, marginVertical: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  timeframeToggle: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  timeframeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  timeframeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  listContainer: { gap: 12 },
  row: { gap: 6 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowTitle: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  rowTime: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  emptyWrap: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
