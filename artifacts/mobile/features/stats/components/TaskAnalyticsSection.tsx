import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { BaseBarList, type BarListItem } from './BaseBarList';
import type { Timeframe } from '../hooks/useTimeframeData';

interface TaskItem extends BarListItem {
  title: string;
}

interface TaskAnalyticsProps {
  data: [string, { title: string; mins: number }][]; // Directly takes domain tuple
  maxMinutes: number;
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const TaskAnalyticsSection: React.FC<TaskAnalyticsProps> = React.memo(({
  data,
  maxMinutes,
  selectedTimeframe,
  onTimeframeChange
}) => {
  const colors = useColors();
  const timeframes: Timeframe[] = ['today', 'yesterday', 'week'];

  // Map domain tuples to the format BaseBarList expects, preserving title
  const mappedData = React.useMemo<TaskItem[]>(() =>
    data.map(([id, info]) => ({ id, title: info.title, minutes: info.mins })),
  [data]);

  return (
    <BaseBarList<TaskItem>
      title="Task Journey"
      data={mappedData}
      maxMinutes={maxMinutes}
      timeframes={timeframes}
      selectedTimeframe={selectedTimeframe}
      onTimeframeChange={onTimeframeChange}
      emptyMessage="No tasks logged for this timeframe."
      renderHeader={(item: TaskItem) => {
        const hours = Math.floor(item.minutes / 60);
        const minsRem = item.minutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${minsRem}m` : `${minsRem}m`;

        return (
          <View style={styles.headerRow}>
            <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeStr}</Text>
          </View>
        );
      }}
    />
  );
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  taskTitle: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  timeText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
