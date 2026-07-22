import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
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
        withSpring(-6, { damping: 10, stiffness: 40, mass: 1 }),
        withSpring(0, { damping: 10, stiffness: 40, mass: 1 })
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
