import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { InsightItem } from '../hooks/useInsights';

interface InsightsCardProps {
  insights: InsightItem[];
}

/**
 * Renders intelligent, heuristic productivity patterns in a premium card design
 * with custom icons, color badges, and clear visual hierarchy.
 */
export const InsightsCard: React.FC<InsightsCardProps> = ({ insights }) => {
  const colors = useColors();

  if (!insights || insights.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Feather name="zap" size={15} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Patterns & Insights</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>AI-detected rhythm signals</Text>
          </View>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '33' }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.liveText, { color: colors.primary }]}>LIVE</Text>
        </View>
      </View>

      {/* Insight Items */}
      <View style={styles.patternList}>
        {insights.map((insight) => (
          <View
            key={insight.id}
            style={[
              styles.patternCard,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            {/* Accent Icon Pill */}
            <View style={[styles.iconCircle, { backgroundColor: insight.color + '18' }]}>
              <Feather name={(insight.icon || 'zap') as any} size={17} color={insight.color} />
            </View>

            {/* Content Column */}
            <View style={styles.contentCol}>
              <View style={styles.titleRow}>
                <Text style={[styles.patternTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {insight.title}
                </Text>
                {insight.badge && (
                  <View style={[styles.metricBadge, { backgroundColor: insight.color + '15' }]}>
                    <Text style={[styles.metricText, { color: insight.color }]}>
                      {insight.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.patternDesc, { color: colors.mutedForeground }]}>
                {insight.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14, marginVertical: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconCircle: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  cardSubtitle: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  patternList: { gap: 10 },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  contentCol: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  patternTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  metricBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  metricText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  patternDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
