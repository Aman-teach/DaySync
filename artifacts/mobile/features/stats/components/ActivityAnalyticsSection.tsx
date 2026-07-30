import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { BaseBarList } from './BaseBarList';
import type { Timeframe } from '../hooks/useTimeframeData';

interface ActivityAnalyticsProps {
  data: [string, number][];
  maxMinutes: number;
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const ActivityAnalyticsSection: React.FC<ActivityAnalyticsProps> = React.memo(({
  data,
  maxMinutes,
  selectedTimeframe,
  onTimeframeChange,
}) => {
  const colors = useColors();
  const { activities, domains } = useApp();
  const timeframes: Timeframe[] = ['today', 'yesterday', 'week', 'all'];

  const mappedData = React.useMemo(
    () => data.map(([id, minutes]) => ({ id, minutes })),
    [data]
  );

  return (
    <BaseBarList
      title="Time by Activity"
      data={mappedData}
      maxMinutes={maxMinutes}
      timeframes={timeframes}
      selectedTimeframe={selectedTimeframe}
      onTimeframeChange={onTimeframeChange}
      emptyMessage="No activity data logged yet. Start tagging sessions with an activity!"
      renderHeader={(item) => {
        const activity = activities.find(a => a.id === item.id);
        const parentDomain = activity ? domains.find(d => d.id === activity.domainId) : undefined;
        const hours = Math.floor(item.minutes / 60);
        const minsRem = item.minutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${minsRem}m` : `${minsRem}m`;

        return (
          <View style={styles.headerRow}>
            <View style={styles.labelRow}>
              {parentDomain && (
                <View style={[styles.dot, { backgroundColor: parentDomain.color }]} />
              )}
              <Feather
                name={(activity?.icon ?? 'zap') as any}
                size={14}
                color={parentDomain?.color ?? colors.primary}
              />
              <View style={styles.labelStack}>
                <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
                  {activity?.name ?? item.id}
                </Text>
                {parentDomain && (
                  <View style={styles.sublabelRow}>
                    <Feather name={(parentDomain.icon ?? 'folder') as any} size={10} color={colors.mutedForeground} />
                    <Text style={[styles.sublabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {' '}{parentDomain.name}
                    </Text>
                  </View>
                )}
              </View>
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
  labelStack: { flex: 1 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  sublabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  sublabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  timeText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
