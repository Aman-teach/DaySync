import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { BaseBarList } from './BaseBarList';
import type { Timeframe } from '../hooks/useTimeframeData';

interface DomainAnalyticsProps {
  data: [string, number][];
  maxMinutes: number;
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const DomainAnalyticsSection: React.FC<DomainAnalyticsProps> = React.memo(({
  data,
  maxMinutes,
  selectedTimeframe,
  onTimeframeChange,
}) => {
  const colors = useColors();
  const { domains } = useApp();
  const timeframes: Timeframe[] = ['today', 'yesterday', 'week', 'all'];

  const mappedData = React.useMemo(
    () => data.map(([id, minutes]) => ({ id, minutes })),
    [data]
  );

  return (
    <BaseBarList
      title="Time by Domain"
      data={mappedData}
      maxMinutes={maxMinutes}
      timeframes={timeframes}
      selectedTimeframe={selectedTimeframe}
      onTimeframeChange={onTimeframeChange}
      emptyMessage="No domain data logged yet. Start tagging sessions with a domain!"
      renderHeader={(item) => {
        const domain = domains.find(d => d.id === item.id);
        const hours = Math.floor(item.minutes / 60);
        const minsRem = item.minutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${minsRem}m` : `${minsRem}m`;

        return (
          <View style={styles.headerRow}>
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: domain?.color ?? colors.primary }]} />
              <Feather
                name={(domain?.icon ?? 'folder') as any}
                size={14}
                color={domain?.color ?? colors.primary}
              />
              <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
                {domain?.name ?? item.id}
              </Text>
            </View>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeStr}</Text>
          </View>
        );
      }}
    />
  );
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  icon: { fontSize: 14 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  timeText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
