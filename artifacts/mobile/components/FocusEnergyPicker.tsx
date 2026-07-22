import React, { useEffect, useRef } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { FocusLevel, EnergyLevel } from '@/types';

const FOCUS_OPTIONS: { value: FocusLevel; label: string; color: string; emoji: string }[] = [
  { value: 'deep',  label: 'Deep',  emoji: '⚡', color: '#2D6A4F' },
  { value: 'light', label: 'Light', emoji: '🌤', color: '#D97706' },
  { value: 'off',   label: 'Off',   emoji: '💤', color: '#6B7280' },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; emoji: string }[] = [
  { value: 'high', label: 'High', emoji: '🔋' },
  { value: 'low',  label: 'Low',  emoji: '🪫' },
];

// ─── Animated segmented control ─────────────────────────────────────────────
function SegmentedPicker<T extends string>({
  options,
  value,
  onChange,
  activeColor,
}: {
  options: { value: T; label: string; emoji: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
  activeColor?: string;
}) {
  const colors = useColors();
  const segX     = useSharedValue(0);
  const segWidth = useSharedValue(0);
  const containerW = useSharedValue(0);
  const measured   = useRef(false);

  const currentIdx = options.findIndex(o => o.value === value);

  const slide = (idx: number) => {
    const w = containerW.value / options.length;
    segX.value    = withSpring(idx * w, { damping: 18, stiffness: 260 });
    segWidth.value = withSpring(w,      { damping: 18, stiffness: 260 });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    containerW.value = w;
    // Only snap on first measure
    if (!measured.current) {
      measured.current = true;
      const idx = options.findIndex(o => o.value === value);
      segX.value    = (idx * w) / options.length;
      segWidth.value = w / options.length;
    }
  };

  useEffect(() => {
    if (measured.current) {
      slide(currentIdx);
    }
  }, [value]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: segX.value }],
    width: segWidth.value,
  }));

  return (
    <View
      style={[styles.segTrack, { backgroundColor: colors.muted }]}
      onLayout={onLayout}
    >
      {/* Sliding background pill */}
      <Animated.View
        style={[
          styles.segPill,
          { backgroundColor: activeColor ?? colors.primary },
          pillStyle,
        ]}
        pointerEvents="none"
      />

      {/* Options */}
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={styles.segOption}
            onPress={() => {
              if (active) return;
              try { Haptics.selectionAsync(); } catch {}
              onChange(opt.value);
            }}
          >
            <Text style={styles.segEmoji}>{opt.emoji}</Text>
            <Text
              style={[
                styles.segLabel,
                { color: active ? '#fff' : colors.mutedForeground },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface Props {
  focus:          FocusLevel;
  energy:         EnergyLevel;
  onFocusChange:  (f: FocusLevel)  => void;
  onEnergyChange: (e: EnergyLevel) => void;
  tintOnDark?: boolean;
}

export function FocusEnergyPicker({
  focus,
  energy,
  onFocusChange,
  onEnergyChange,
  tintOnDark,
}: Props) {
  const colors = useColors();
  const focusColor = FOCUS_OPTIONS.find(o => o.value === focus)?.color ?? colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Focus</Text>
        <View style={{ flex: 1 }}>
          <SegmentedPicker
            options={FOCUS_OPTIONS}
            value={focus}
            onChange={onFocusChange}
            activeColor={focusColor}
          />
        </View>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Energy</Text>
        <View style={{ flex: 1 }}>
          <SegmentedPicker
            options={ENERGY_OPTIONS}
            value={energy}
            onChange={onEnergyChange}
            activeColor={colors.primary}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    width: 56,
  },
  segTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  segPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 11,
  },
  segOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 5,
    zIndex: 1,
  },
  segEmoji: { fontSize: 13, includeFontPadding: false } as object,
  segLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
