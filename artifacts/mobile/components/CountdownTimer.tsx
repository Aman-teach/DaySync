import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { getNextTargetTime } from '@/utils/time';

export function CountdownTimer({ hideLabel = false }: { hideLabel?: boolean } = {}) {
  const { settings, todayEntries } = useApp();
  const colors = useColors();

  const [targetTime, setTargetTime] = useState(() =>
    getNextTargetTime(settings.interval, settings.activeStart, settings.activeEnd)
  );
  
  const [msLeft, setMsLeft] = useState(() => Math.max(0, targetTime - Date.now()));

  const progressVal = useSharedValue(1);

  // Instantly recalculate target time if user changes settings or adds an entry
  useEffect(() => {
    setTargetTime(getNextTargetTime(settings.interval, settings.activeStart, settings.activeEnd));
  }, [settings.interval, settings.activeStart, settings.activeEnd]);

  useEffect(() => {
    const total = settings.interval * 60 * 1000;
    const tick = () => {
      let left = Math.max(0, targetTime - Date.now());
      if (left === 0) {
        const nextTarget = getNextTargetTime(settings.interval, settings.activeStart, settings.activeEnd);
        setTargetTime(nextTarget);
        left = Math.max(0, nextTarget - Date.now());
      }
      setMsLeft(left);
      progressVal.value = withTiming(left / total, { duration: 900 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime, settings]);

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
      {!hideLabel && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Next check-in
        </Text>
      )}
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
  container: { alignItems: 'center', gap: 2 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  time: { fontSize: 48, fontFamily: 'Inter_700Bold', lineHeight: 48, letterSpacing: -2 },
  track: {
    width: 100,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: { height: 4, borderRadius: 2 },
});
