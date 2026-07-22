import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  data: Record<string, number>; // dateKey -> focusScore (0-100)
  weeks?: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getColor(score: number): string {
  if (score === 0) return 'transparent';
  if (score < 25) return '#B7E4C7';
  if (score < 50) return '#74C69D';
  if (score < 75) return '#40916C';
  return '#1B4332';
}

function buildGrid(weeks: number): Date[][] {
  const grid: Date[][] = [];
  const today = new Date();
  // Start from the most recent Sunday
  const endSunday = new Date(today);
  endSunday.setDate(endSunday.getDate() + (6 - endSunday.getDay()));

  for (let w = weeks - 1; w >= 0; w--) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(endSunday);
      date.setDate(endSunday.getDate() - w * 7 - (6 - d));
      week.push(date);
    }
    grid.push(week);
  }
  return grid;
}

export function HeatmapCalendar({ data, weeks = 16 }: Props) {
  const colors = useColors();
  const grid = buildGrid(weeks);

  return (
    <View style={styles.container}>
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={[styles.dayLabel, { color: colors.mutedForeground }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((date, di) => {
              const key = date.toISOString().slice(0, 10);
              const score = data[key] ?? 0;
              const bg = score > 0 ? getColor(score) : colors.muted;
              const isFuture = date > new Date();
              return (
                <View
                  key={di}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: isFuture ? 'transparent' : bg,
                      borderColor: isFuture ? 'transparent' : colors.border,
                      borderWidth: isFuture ? 0 : 0.5,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  dayLabels: {
    flexDirection: 'column',
    position: 'absolute',
    left: -16,
    top: 0,
    gap: 2,
  },
  dayLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', height: 13, lineHeight: 13 },
  grid: { flexDirection: 'row', gap: 2 },
  week: { flexDirection: 'column', gap: 2 },
  cell: { width: 13, height: 13, borderRadius: 2 },
});
