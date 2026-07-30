import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FocusLevel } from '@/types';

// ─── Proportional brick heights — fits comfortably on screen ───────────────
//  15 min  →  14px  (thin brick)
//  30 min  →  19px  (standard brick)
//  60 min  →  31px  (double brick, clearly taller)
// 120 min  →  54px  (mega block, very obviously bigger)
//
// Formula: 8 + intervalMinutes * 0.38 (min 14px)
export function getBrickHeight(intervalMinutes: number): number {
  return Math.max(14, Math.round(8 + intervalMinutes * 0.38));
}

// ─── Block palettes ──────────────────────────────────────────────────────────
const BLOCK_PALETTES: Record<string, { top: string; front: string; side: string; accent: string; glow: string; label: string }> = {
  deep: {
    top:    '#52B788',
    front:  '#2D6A4F',
    side:   '#1B4332',
    accent: '#74C69D',
    glow:   '#52B78840',
    label:  'Deep',
  },
  normal: {
    top:    '#60A5FA',
    front:  '#2563EB',
    side:   '#1D4ED8',
    accent: '#93C5FD',
    glow:   '#3B82F640',
    label:  'Normal',
  },
  // legacy alias
  light: {
    top:    '#60A5FA',
    front:  '#2563EB',
    side:   '#1D4ED8',
    accent: '#93C5FD',
    glow:   '#3B82F640',
    label:  'Normal',
  },
  neutral: {
    top:    '#818CF8',
    front:  '#4F46E5',
    side:   '#3730A3',
    accent: '#A5B4FC',
    glow:   '#6366F130',
    label:  'Neutral',
  },
  distracted: {
    top:    '#FCA5A5',
    front:  '#DC2626',
    side:   '#991B1B',
    accent: '#FECACA',
    glow:   '#EF444440',
    label:  'Distracted',
  },
  // legacy alias
  off: {
    top:    '#9CA3AF',
    front:  '#4B5563',
    side:   '#374151',
    accent: '#9CA3AF',
    glow:   '#6B728030',
    label:  'Off',
  },
};

// ─── Fixed brick column width ────────────────────────────────────────────────
const BRICK_W  = 160;  // fixed px width of the front face
const SIDE_W   = 12;   // px width of the right 3D side face
const TOP_H    = 7;    // px height of the top face

interface Props {
  focus: FocusLevel;
  intervalMinutes: number;
  animate?: boolean;
  mini?: boolean;
  index?: number;
}

// ─── Mini block for history strip ────────────────────────────────────────────
export function MiniTowerBlock({ focus }: { focus: FocusLevel }) {
  const p = BLOCK_PALETTES[focus] ?? BLOCK_PALETTES.off;
  return (
    <View style={miniStyles.wrapper}>
      {/* top face */}
      <View style={[miniStyles.top, { backgroundColor: p.top }]} />
      {/* front face */}
      <View style={[miniStyles.front, { backgroundColor: p.front }]} />
      {/* side face */}
      <View style={[miniStyles.side, { backgroundColor: p.side }]} />
    </View>
  );
}

// ─── Full isometric brick ────────────────────────────────────────────────────
function FullBlock({ focus, intervalMinutes, animate = false, index = 0 }: Props) {
  const p = BLOCK_PALETTES[focus] ?? BLOCK_PALETTES.off;
  const BLOCK_H = getBrickHeight(intervalMinutes);

  const scaleY     = useSharedValue(animate ? 0.01 : 1);
  const opacity    = useSharedValue(animate ? 0 : 1);
  const translateY = useSharedValue(animate ? 12 : 0);

  useEffect(() => {
    if (animate) {
      const delay = index * 55;
      scaleY.value     = withDelay(delay, withSpring(1, { damping: 12, stiffness: 150 }));
      opacity.value    = withDelay(delay, withTiming(1, { duration: 220 }));
      translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 130 }));
    }
  }, [animate, index]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scaleY: scaleY.value },
      { translateY: translateY.value },
    ],
    transformOrigin: 'bottom center',
  }));

  // How many texture lines to draw based on height
  const textureCount = Math.floor(BLOCK_H / 10);

  const showLabelInside = BLOCK_H >= 26;

  return (
    <Animated.View style={[styles.brickRow, animStyle]}>
      {/* ── Brick (top + front + side) ── */}
      <View style={styles.brick}>
        {/* Top face */}
        <View style={[styles.topFace, { width: BRICK_W, backgroundColor: p.top }]}>
          <View style={[styles.topSheen, { backgroundColor: '#ffffff22' }]} />
        </View>

        {/* Front + Side faces in a row */}
        <View style={styles.facesRow}>
          {/* Front face */}
          <View style={[styles.frontFace, { width: BRICK_W, height: BLOCK_H, backgroundColor: p.front }]}>
            {/* Left accent stripe */}
            <View style={[styles.accentStripe, { backgroundColor: p.accent + '50' }]} />
            {/* Texture grooves */}
            {Array.from({ length: textureCount }).map((_, i) => (
              <View key={i} style={[styles.groove, { top: 6 + i * 10, backgroundColor: '#00000018' }]} />
            ))}
            {/* Inside label for tall blocks */}
            {showLabelInside && (
              <Text style={[styles.intervalLabel, { color: p.accent + 'cc' }]}>
                {intervalMinutes}m · {p.label}
              </Text>
            )}
            {/* Bottom edge shadow */}
            <View style={[styles.bottomShadow, { backgroundColor: p.side + '88' }]} />
          </View>

          {/* Right side face (3D depth) */}
          <View style={[styles.sideFace, { width: SIDE_W, height: BLOCK_H, backgroundColor: p.side }]}>
            <View style={[styles.sideHighlight, { backgroundColor: '#ffffff15' }]} />
          </View>
        </View>

        {/* Glow beneath */}
        <View style={[styles.glow, { backgroundColor: p.glow, width: BRICK_W + SIDE_W }]} />
      </View>

      {/* Outside label for short blocks */}
      {!showLabelInside && (
        <View style={[styles.outsideLabelWrap, { height: BLOCK_H + TOP_H }]}>
          <Text numberOfLines={1} style={[styles.outsideLabel, { color: p.front }]}>
            {intervalMinutes}m · {p.label}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export function TowerBlock(props: Props) {
  if (props.mini) return <MiniTowerBlock focus={props.focus} />;
  return <FullBlock {...props} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  brickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    position: 'relative',
  },
  brick: {
    alignItems: 'flex-start',
    position: 'relative',
  },
  topFace: {
    height: TOP_H,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  topSheen: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: '60%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  facesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  frontFace: {
    overflow: 'hidden',
    position: 'relative',
    borderBottomLeftRadius: 2,
  },
  accentStripe: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 5,
    borderBottomLeftRadius: 2,
  },
  groove: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1.5,
  },
  intervalLabel: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
  },
  bottomShadow: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 4,
    borderBottomLeftRadius: 2,
  },
  sideFace: {
    overflow: 'hidden',
    position: 'relative',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  sideHighlight: {
    position: 'absolute',
    left: 0, top: 0,
    width: 2,
    bottom: 0,
  },
  glow: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
    zIndex: -1,
  },
  outsideLabelWrap: {
    position: 'absolute',
    left: BRICK_W + SIDE_W + 8,
    width: 120,
    height: '100%',
    justifyContent: 'center',
  },
  outsideLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});

const miniStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: 2,
    alignItems: 'flex-start',
  },
  top: {
    width: 22,
    height: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  front: {
    width: 22,
    height: 10,
    borderBottomLeftRadius: 2,
  },
  side: {
    position: 'absolute',
    right: -4,
    top: 4,
    width: 4,
    height: 10,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 0.7,
  },
});
