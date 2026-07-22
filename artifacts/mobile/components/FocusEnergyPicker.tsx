import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { FocusLevel, EnergyLevel } from '@/types';

const FOCUS_OPTIONS: { value: FocusLevel; label: string; color: string }[] = [
  { value: 'deep', label: 'Deep', color: '#2D6A4F' },
  { value: 'light', label: 'Light', color: '#E8A838' },
  { value: 'off', label: 'Off', color: '#9CA3AF' },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
];

interface Props {
  focus: FocusLevel;
  energy: EnergyLevel;
  onFocusChange: (f: FocusLevel) => void;
  onEnergyChange: (e: EnergyLevel) => void;
}

export function FocusEnergyPicker({
  focus,
  energy,
  onFocusChange,
  onEnergyChange,
}: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Focus</Text>
        <View style={styles.row}>
          {FOCUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onFocusChange(opt.value)}
              style={[
                styles.pill,
                {
                  backgroundColor:
                    focus === opt.value ? opt.color : colors.muted,
                  borderColor:
                    focus === opt.value ? opt.color : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: focus === opt.value ? '#fff' : colors.mutedForeground },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Energy</Text>
        <View style={styles.row}>
          {ENERGY_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onEnergyChange(opt.value)}
              style={[
                styles.pill,
                {
                  backgroundColor:
                    energy === opt.value ? colors.primary : colors.muted,
                  borderColor:
                    energy === opt.value ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color:
                      energy === opt.value ? '#fff' : colors.mutedForeground,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  group: { gap: 8 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  pillText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
