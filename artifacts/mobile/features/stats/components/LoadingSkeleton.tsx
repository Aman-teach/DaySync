import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface LoadingSkeletonProps {
  topPadding?: number;
}

/**
 * Reusable loading skeleton for the Stats screen.
 * Safely mimics the layout to prevent layout jumping while initial data loads.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ topPadding = 40 }) => {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.titleSkeleton, { backgroundColor: colors.muted }]} />
        <View style={styles.versusRow}>
          <View style={[styles.statCardSkeleton, { backgroundColor: colors.muted }]} />
          <View style={[styles.statCardSkeleton, { backgroundColor: colors.muted }]} />
        </View>
        <View style={[styles.cardSkeleton, { backgroundColor: colors.muted, height: 200 }]} />
        <View style={[styles.cardSkeleton, { backgroundColor: colors.muted, height: 160 }]} />
        <View style={[styles.cardSkeleton, { backgroundColor: colors.muted, height: 250 }]} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 14 },
  titleSkeleton: { width: 120, height: 32, borderRadius: 8, marginBottom: 8 },
  versusRow: { flexDirection: 'row', gap: 16 },
  statCardSkeleton: { flex: 1, height: 100, borderRadius: 16 },
  cardSkeleton: { width: '100%', borderRadius: 18 },
});
