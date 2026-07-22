import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface Props {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
}

export function StatsRing({
  segments,
  size = 140,
  strokeWidth = 18,
  centerLabel,
  centerSub,
}: Props) {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let offset = 0;
  const arcs = segments.map((seg, i) => {
    const pct = total > 0 ? seg.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const strokeDashoffset = -offset * circumference;
    offset += pct;
    return { ...seg, dash, gap, strokeDashoffset };
  });

  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={colors.muted}
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {arcs.map((arc, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={arc.strokeDashoffset}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${cx}, ${cy}`}
          />
        ))}
      </Svg>

      {/* Center label */}
      {(centerLabel || centerSub) && (
        <View style={[styles.center, { width: size, height: size }]}>
          {centerLabel && (
            <Text style={[styles.centerLabel, { color: colors.foreground }]}>
              {centerLabel}
            </Text>
          )}
          {centerSub && (
            <Text style={[styles.centerSub, { color: colors.mutedForeground }]}>
              {centerSub}
            </Text>
          )}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>
              {seg.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12 },
  center: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  centerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
