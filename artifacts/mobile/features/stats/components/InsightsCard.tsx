import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface InsightsCardProps {
  insights: string[];
}

/**
 * Renders the heuristic observation strings passed down from the domain layer.
 */
export const InsightsCard: React.FC<InsightsCardProps> = ({ insights }) => {
  const colors = useColors();

  if (!insights || insights.length === 0) return null;

  return (
    <View style={styles.card2}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Observations</Text>
      <View style={styles.patternList}>
        {insights.map((insight, index) => (
          <View 
            key={index} 
            style={[styles.patternCard, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Text style={[styles.patternText, { color: colors.foreground }]}>
              {insight}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card2: { gap: 10, marginVertical: 8 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  patternList: { gap: 8 },
  patternCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  patternText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
