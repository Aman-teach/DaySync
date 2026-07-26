import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface EmptyStateProps {
  title?: string;
  message?: string;
  topPadding?: number;
}

/**
 * Reusable empty state component for the Stats domain.
 * Degrades gracefully and supports custom padding.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title = 'No data yet', 
  message = 'Start logging check-ins and your patterns will appear here.', 
  topPadding = 40 
}) => {
  const colors = useColors();

  return (
    <View style={[styles.emptyContainer, { paddingTop: topPadding }]}>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: { 
    flex: 1, 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 40 
  },
  emptyTitle: { 
    fontSize: 20, 
    fontFamily: 'Inter_700Bold' 
  },
  emptyText: { 
    fontSize: 14, 
    fontFamily: 'Inter_400Regular', 
    textAlign: 'center', 
    lineHeight: 22 
  },
});
