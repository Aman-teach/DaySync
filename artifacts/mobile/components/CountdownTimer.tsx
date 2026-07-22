import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

function computeMsLeft(interval: number, activeStart: number, activeEnd: number): number {
  const now = new Date();
  const next = new Date(now.getTime() + interval * 60 * 1000);
  const h = next.getHours();
  if (h < activeStart) {
    next.setHours(activeStart, 0, 0, 0);
  } else if (h >= activeEnd) {
    next.setDate(next.getDate() + 1);
    next.setHours(activeStart, 0, 0, 0);
  }
  return Math.max(0, next.getTime() - now.getTime());
}

export function CountdownTimer() {
  const { settings } = useApp();
  const colors = useColors();
  const [msLeft, setMsLeft] = useState(() =>
    computeMsLeft(settings.interval, settings.activeStart, settings.activeEnd)
  );

  const progressVal = useSharedValue(1);

  useEffect(() => {
    const total = settings.interval * 60 * 1000;
    const tick = () => {
      const ms = computeMsLeft(settings.interval, settings.activeStart, settings.activeEnd);
      setMsLeft(ms);
      progressVal.value = withTiming(ms / total, { duration: 900 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [settings]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progressVal.value * 100}%`,
  }));

  const totalSeconds = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const displayTime =
    hours > 0
      ? `${hours}h ${String(minutes).padStart(2, '0')}m`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Next check-in
      </Text>
      <Text style={[styles.time, { color: colors.primary }]}>
        {displayTime}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[styles.fill, barStyle, { backgroundColor: colors.primary }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  label: { fontSize: 12, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  time: { fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -1.5 },
  track: {
    width: 120,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: 3, borderRadius: 2 },
});
