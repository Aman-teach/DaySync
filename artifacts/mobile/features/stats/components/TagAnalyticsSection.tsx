import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { TagChip } from '@/components/TagChip';
import { BaseBarList } from './BaseBarList';
import type { Timeframe } from '../hooks/useTimeframeData';

interface TagAnalyticsProps {
  data: [string, number][]; // Directly takes domain tuple
  maxMinutes: number;
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const TagAnalyticsSection: React.FC<TagAnalyticsProps> = React.memo(({
  data,
  maxMinutes,
  selectedTimeframe,
  onTimeframeChange
}) => {
  const colors = useColors();
  const timeframes: Timeframe[] = ['today', 'yesterday', 'week', 'all'];

  // Map domain tuples to the format expected by the BaseBarList
  const mappedData = React.useMemo(() => data.map(([id, minutes]) => ({ id, minutes })), [data]);

  return (
    <BaseBarList
      title="Time by Tag"
      data={mappedData}
      maxMinutes={maxMinutes}
      timeframes={timeframes}
      selectedTimeframe={selectedTimeframe}
      onTimeframeChange={onTimeframeChange}
      emptyMessage="No tags logged for this timeframe."
      renderHeader={(item) => {
        const hours = Math.floor(item.minutes / 60);
        const minsRem = item.minutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${minsRem}m` : `${minsRem}m`;

        return (
          <View style={styles.headerRow}>
            <TagChip tagId={item.id} size="sm" />
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeStr}</Text>
          </View>
        );
      }}
    />
  );
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  timeText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
