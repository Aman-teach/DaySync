import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getTag, TagConfig, TAGS } from '@/constants/tags';
import { useApp } from '@/context/AppContext';

interface Props {
  tagId: string;
  tag?: TagConfig;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function TagChip({ tagId, tag: tagProp, selected = false, onPress, size = 'sm' }: Props) {
  // Use the context tags to ensure custom tags are resolved properly
  const { tags } = useApp();
  
  const tag = tagProp ?? tags.find(t => t.id === tagId) ?? getTag(tagId);
  const label  = tag?.label ?? tagId;
  const icon   = tag?.icon;
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
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
            borderColor: (tag?.color ?? '#cccccc') + '55',
          },
          containerStyle,
        ]}
      >
        {typeof icon === 'string' && icon.length > 0 ? (
          <Feather
            name={icon as any}
            size={isSmall ? 12 : 14}
            color={selected ? '#fff' : textColor}
          />
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
