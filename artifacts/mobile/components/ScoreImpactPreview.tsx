import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FocusLevel } from '@/types';
import { Feather } from '@expo/vector-icons';

interface Props {
  focus: FocusLevel;
}

export function ScoreImpactPreview({ focus }: Props) {
  // Config for each focus level
  const getConfig = () => {
    switch (focus) {
      case 'deep':
        return { text: '+20 Focus Points', color: '#10B981', icon: 'zap' as const };
      case 'normal':
      case 'light':
        return { text: '+10 Focus Points', color: '#0891B2', icon: 'sun' as const };
      case 'neutral':
        return { text: 'Score Paused', color: '#9CA3AF', icon: 'coffee' as const };
      case 'distracted':
      case 'off':
        return { text: '-10 Focus Points', color: '#F43F5E', icon: 'alert-circle' as const };
      default:
        return { text: 'Score Paused', color: '#9CA3AF', icon: 'circle' as const };
    }
  };

  const config = getConfig();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  // Trigger a subtle fade effect when focus changes
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 250 });
  }, [focus]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.badge, animatedStyle]}>
      <Feather name={config.icon} size={12} color={config.color} style={{ marginRight: 4 }} />
      <Text style={[styles.text, { color: config.color }]}>
        {config.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto', // Pushes it to the right if in a row
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
});
