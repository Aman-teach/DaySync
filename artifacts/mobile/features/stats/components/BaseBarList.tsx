import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Timeframe } from '../hooks/useTimeframeData';

export interface BarListItem {
  id: string;
  minutes: number;
}

interface BaseBarListProps<T extends BarListItem> {
  title: string;
  data: T[];
  maxMinutes: number;
  timeframes: readonly Timeframe[];
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  renderHeader: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

/**
 * Pure, generic bar chart component.
 * Responsible ONLY for rendering the layout, bars, and toggles.
 * Leaves the specific item header rendering (TagChip vs Text) to the consumer.
 */
export const BaseBarList = React.memo(<T extends BarListItem>({
  title,
  data,
  maxMinutes,
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  renderHeader,
  emptyMessage = "No data logged for this timeframe."
}: BaseBarListProps<T>) => {
  const colors = useColors();
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
            
            return (
              <View key={item.id} style={styles.row}>
                {renderHeader(item)}
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
}) as <T extends BarListItem>(props: BaseBarListProps<T>) => React.ReactElement; // Keeps generic type for memo

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14, marginVertical: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  timeframeToggle: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  timeframeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  timeframeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  listContainer: { gap: 12 },
  row: { gap: 6 },
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  emptyWrap: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
