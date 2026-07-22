import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { FocusLevel } from '@/types';

const BLOCK_COLORS = {
  deep: { bg: '#1B4332', border: '#D4AF37', shine: '#40916C' },
  light: { bg: '#8B5E3C', border: '#A0785A', shine: '#C4956A' },
  off: { bg: '#5C3535', border: '#7D4545', shine: '#7D4545' },
};

interface Props {
  focus: FocusLevel;
  intervalMinutes: number;
  animate?: boolean;
  mini?: boolean;
}

function BlockInner({
  focus,
  intervalMinutes,
  animate,
  mini,
}: Props) {
  const scale = useSharedValue(animate ? 0 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      opacity.value = withSpring(1, { damping: 14 });
    }
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
    opacity: opacity.value,
  }));

  if (mini) {
    const height = Math.max(4, intervalMinutes * 0.12);
    const palette = BLOCK_COLORS[focus] ?? BLOCK_COLORS.off;
    return (
      <View
        style={{
          height,
          width: 14,
          backgroundColor: palette.bg,
          borderRadius: 2,
          marginBottom: 1,
        }}
      />
    );
  }

  const height = Math.max(28, intervalMinutes * 1.1);
  const palette = BLOCK_COLORS[focus] ?? BLOCK_COLORS.off;

  return (
    <Animated.View style={[animStyle, { transformOrigin: 'bottom' }]}>
      <View
        style={[
          styles.block,
          {
            height,
            backgroundColor: palette.bg,
            borderColor: palette.border,
          },
        ]}
      >
        {/* Shine line */}
        <View
          style={[styles.shine, { backgroundColor: palette.shine + '55' }]}
        />
        {/* Mortar lines (only for larger blocks) */}
        {intervalMinutes >= 30 && (
          <View style={styles.mortarContainer}>
            <View style={[styles.mortar, { backgroundColor: palette.border + '44' }]} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function TowerBlock(props: Props) {
  return <BlockInner {...props} />;
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 4,
    marginBottom: 3,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  shine: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
  },
  mortarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
  },
  mortar: {
    height: 1,
    width: '100%',
  },
});
