import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

/**
 * SectionFallback.tsx
 *
 * User-friendly fallback rendered by SectionBoundary when a Stats section
 * crashes. Maintains layout height so surrounding sections do not collapse.
 *
 * Design rules:
 *  - No warning banners or alarming language
 *  - No technical error messages or stack traces
 *  - Consistent with DaySync typography and muted colour system
 *  - Min-height preserves vertical rhythm of the scrollview
 */
export const SectionFallback: React.FC = () => {
  const colors = useColors();

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>
        Unable to display this section.
      </Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Pull to refresh or try again later.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
