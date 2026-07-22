import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

interface Props {
  size?: number;
}

export function MascotRobot({ size = 72 }: Props) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Image
        source={require('@/assets/images/mascot.png')}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </Animated.View>
  );
}
