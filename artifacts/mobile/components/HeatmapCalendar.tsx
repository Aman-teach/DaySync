import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { getDateKey } from '@/utils/helpers';

interface Props {
  data: Record<string, number>; // dateKey -> focusScore (0-100)
  weeks?: number;
  dayStartHour?: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const HEATMAP_COLORS = [
  '#10B98125', // Level 1: light emerald
  '#10B98160', // Level 2: medium emerald
  '#10B98195', // Level 3: bright emerald
  '#10B981',   // Level 4: peak emerald
];

function getLevelColor(score: number, emptyColor: string): string {
  if (score === 0) return emptyColor;
  if (score < 35) return HEATMAP_COLORS[0];
  if (score < 65) return HEATMAP_COLORS[1];
  if (score < 85) return HEATMAP_COLORS[2];
  return HEATMAP_COLORS[3];
}

/**
 * Builds a rolling 2D grid of weeks (Sun -> Sat) ending on the current week's Saturday.
 * This guarantees today is in the rightmost week column, and old weeks roll off smoothly.
 */
function buildGrid(weeks: number): Date[][] {
  const grid: Date[][] = [];
  const today = new Date();
  
  // Find Saturday of the current week (Sunday=0 -> Saturday=6)
  const endSaturday = new Date(today);
  endSaturday.setDate(today.getDate() + (6 - today.getDay()));

  for (let w = weeks - 1; w >= 0; w--) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(endSaturday);
      date.setDate(endSaturday.getDate() - w * 7 - (6 - d));
      week.push(date);
    }
    grid.push(week);
  }
  return grid;
}

export function HeatmapCalendar({ data, weeks = 9, dayStartHour = 4 }: Props) {
  const colors = useColors();
  const grid = buildGrid(weeks);
  const todayKey = getDateKey(new Date(), dayStartHour);

  // Determine month header labels above columns where a month changes
  const monthLabels = grid.map((week, wi) => {
    const sunDate = week[0];
    const monthName = sunDate.toLocaleDateString('en-US', { month: 'short' });
    if (wi === 0) return monthName;
    const prevSunDate = grid[wi - 1][0];
    if (sunDate.getMonth() !== prevSunDate.getMonth()) {
      return monthName;
    }
    return '';
  });

  return (
    <View style={styles.container}>
      {/* Month headers row */}
      <View style={styles.monthHeaderRow}>
        <View style={styles.dayLabelSpacer} />
        <View style={styles.monthColumns}>
          {monthLabels.map((label, wi) => (
            <View key={wi} style={styles.monthCol}>
              {label ? (
                <Text style={[styles.monthText, { color: colors.mutedForeground }]}>
                  {label}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Main heatmap grid with Day labels on the left */}
      <View style={styles.mainRow}>
        <View style={styles.dayLabelsCol}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={[styles.dayLabel, { color: colors.mutedForeground }]}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((week, wi) => (
            <View key={wi} style={styles.weekCol}>
              {week.map((date, di) => {
                const key = getDateKey(date, dayStartHour);
                const score = data[key] ?? 0;
                const isFuture = key > todayKey;
                const bg = isFuture ? 'transparent' : getLevelColor(score, colors.muted);

                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: bg,
                        borderColor: isFuture ? 'transparent' : colors.border,
                        borderWidth: isFuture ? 0 : 1,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 18,
    marginBottom: 2,
  },
  dayLabelSpacer: {
    width: 14,
  },
  monthColumns: {
    flexDirection: 'row',
    gap: 5,
  },
  monthCol: {
    width: 24,
    height: 18,
    alignItems: 'flex-start',
    overflow: 'visible',
    position: 'relative',
  },
  monthText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    position: 'absolute',
    top: 0,
    left: 0,
    width: 45,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dayLabelsCol: {
    flexDirection: 'column',
    width: 14,
    gap: 5,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    height: 24,
    lineHeight: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 5,
  },
  weekCol: {
    flexDirection: 'column',
    gap: 5,
  },
  cell: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});

