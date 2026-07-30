import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { FocusLevel, EnergyLevel } from '@/types';
import { Feather } from '@expo/vector-icons';
import { ScoreImpactPreview } from '@/components/ScoreImpactPreview';

const FOCUS_OPTIONS: { value: FocusLevel; label: string; sub: string; color: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: 'deep',       label: 'Deep',       sub: 'In the zone',    icon: 'zap',          color: '#4F46E5' },
  { value: 'normal',     label: 'Normal',     sub: 'Casual mode',    icon: 'sun',          color: '#0891B2' },
  { value: 'distracted', label: 'Distracted', sub: 'Loss focus',     icon: 'alert-circle', color: '#F59E0B' },
  { value: 'neutral',    label: 'Neutral',    sub: 'Routine/Life',   icon: 'coffee',       color: '#64748B' },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; sub: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { value: 'high', label: 'High', sub: 'Energized',  icon: 'battery-charging', color: '#10B981' }, // Vibrant Emerald
  { value: 'low',  label: 'Low',  sub: 'Running low', icon: 'battery',          color: '#F59E0B' }, // Amber Warning
];

// ─── Solid Tile-style option ─────────────────────────────────────────────
function OptionPill<T extends string>({
  opt,
  isActive,
  onPress,
  isRecording,
  flex,
}: {
  opt: { value: T; label: string; sub: string; icon: keyof typeof Feather.glyphMap; color: string };
  isActive: boolean;
  onPress: () => void;
  isRecording?: boolean;
  flex?: number;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const bgAnim = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    bgAnim.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const handlePressIn = () => { scale.value = withSpring(0.92, { damping: 15, stiffness: 350 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12, stiffness: 250 }); };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeColor = opt.color;
  
  // To match the tags UI:
  // Active: Solid color, no visible border contrast, white text
  // Inactive: Pastel background, colored border, colored text
  const bg = isActive ? activeColor : (isRecording ? '#ffffff11' : activeColor + '15');
  const border = isActive ? activeColor : (isRecording ? '#ffffff22' : activeColor + '44');
  
  const textColor = isActive ? '#FFFFFF' : (isRecording ? '#ffffff88' : activeColor);
  const iconColor = isActive ? '#FFFFFF' : (isRecording ? '#ffffff66' : activeColor);

  return (
    <Pressable
      style={{ flex: flex ?? 1 }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        if (!isActive) {
          try { Haptics.selectionAsync(); } catch {}
          onPress();
        }
      }}
    >
      <Animated.View style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: isActive ? 0 : 1.5,
          // When active borderWidth is 0, we add 1.5px padding to prevent layout shift
          paddingVertical: isActive ? 9.5 : 8,
          paddingHorizontal: isActive ? 7.5 : 6,
        },
        animatedStyle
      ]}>
        <Feather name={opt.icon} size={15} color={iconColor} />
        <Text style={[styles.pillLabel, { color: textColor }]} numberOfLines={1}>
          {opt.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface Props {
  focus:          FocusLevel;
  energy:         EnergyLevel;
  onFocusChange:  (f: FocusLevel)  => void;
  onEnergyChange: (e: EnergyLevel) => void;
  isRecording?:   boolean;
}

export function FocusEnergyPicker({
  focus,
  energy,
  onFocusChange,
  onEnergyChange,
  isRecording,
}: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Focus */}
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Text style={[styles.groupLabel, { color: isRecording ? '#ffffffcc' : colors.mutedForeground }]}>Focus Level</Text>
          <ScoreImpactPreview focus={focus} />
        </View>
        <View style={styles.row}>
          {FOCUS_OPTIONS.map(opt => (
            <OptionPill
              key={opt.value}
              opt={opt}
              isActive={focus === opt.value}
              onPress={() => {
                if (focus !== opt.value) {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                }
                onFocusChange(opt.value);
              }}
              isRecording={isRecording}
            />
          ))}
        </View>
      </View>

      {/* Energy */}
      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: isRecording ? '#ffffffcc' : colors.mutedForeground }]}>Energy Level</Text>
        <View style={styles.row}>
          {ENERGY_OPTIONS.map(opt => (
            <OptionPill
              key={opt.value}
              opt={opt}
              isActive={energy === opt.value}
              onPress={() => {
                if (energy !== opt.value) {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                }
                onEnergyChange(opt.value);
              }}
              isRecording={isRecording}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  group: { gap: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  groupLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100, // Fully rounded like the tags
    gap: 6,
  },
  pillLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
