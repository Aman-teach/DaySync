import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTag } from '@/constants/tags';

interface Props {
  tagId: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function TagChip({ tagId, selected, onPress, size = 'sm' }: Props) {
  const tag = getTag(tagId);
  const label = tag?.label ?? tagId;
  const bgColor = tag?.bg ?? '#E8E8E8';
  const textColor = tag?.color ?? '#444';
  const isSmall = size === 'sm';

  const chip = (
    <View
      style={[
        styles.chip,
        isSmall ? styles.chipSm : styles.chipMd,
        {
          backgroundColor: selected ? tag?.color ?? '#2D6A4F' : bgColor,
          borderWidth: selected ? 0 : 1,
          borderColor: tag?.color ?? '#ccc',
          opacity: selected ? 1 : 0.85,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSm : styles.labelMd,
          { color: selected ? '#fff' : textColor },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {chip}
      </TouchableOpacity>
    );
  }
  return chip;
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  chipSm: { paddingHorizontal: 8, paddingVertical: 3 },
  chipMd: { paddingHorizontal: 12, paddingVertical: 6 },
  label: { fontFamily: 'Inter_600SemiBold' },
  labelSm: { fontSize: 11 },
  labelMd: { fontSize: 13 },
});
