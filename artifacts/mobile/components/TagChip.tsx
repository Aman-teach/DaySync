import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { getTag } from '@/constants/tags';

interface Props {
  tagId: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function TagChip({ tagId, selected = false, onPress, size = 'sm' }: Props) {
  const tag = getTag(tagId);
  const label  = tag?.label ?? tagId;
  const emoji  = tag?.emoji ?? '';
  const bgColor    = tag?.bg    ?? '#E8E8E8';
  const textColor  = tag?.color ?? '#444';
  const isSmall = size === 'sm';

  const scale   = useSharedValue(1);
  const bgAnim  = useSharedValue(selected ? 1 : 0);

  // Sync bgAnim when `selected` changes from outside
  useEffect(() => {
    bgAnim.value = withTiming(selected ? 1 : 0, { duration: 180 });
  }, [selected]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.89, { damping: 12, stiffness: 380 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8, stiffness: 260 });
  };

  const handlePress = () => {
    // Bounce confirm
    scale.value = withSpring(selected ? 0.95 : 1.08, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 9, stiffness: 220 });
    });
    onPress?.();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.chip,
          isSmall ? styles.chipSm : styles.chipMd,
          {
            backgroundColor: selected ? tag?.color ?? '#2D6A4F' : bgColor,
            borderWidth: selected ? 0 : 1.5,
            borderColor: (tag?.color ?? '#ccc') + '55',
          },
          containerStyle,
        ]}
      >
        {emoji ? (
          <Text style={[styles.emoji, isSmall ? styles.emojiSm : styles.emojiMd]}>
            {emoji}
          </Text>
        ) : null}
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
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    alignSelf: 'flex-start',
    gap: 4,
  },
  chipSm: { paddingHorizontal: 9,  paddingVertical: 4  },
  chipMd: { paddingHorizontal: 13, paddingVertical: 7  },
  emoji:  { includeFontPadding: false },
  emojiSm: { fontSize: 12 },
  emojiMd: { fontSize: 14 },
  label:  { fontFamily: 'Inter_600SemiBold' },
  labelSm: { fontSize: 11.5 },
  labelMd: { fontSize: 13   },
});
