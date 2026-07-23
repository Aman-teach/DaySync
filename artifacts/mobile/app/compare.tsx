import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EntryCard } from '@/components/EntryCard';
import { getDateKey, getEntriesForDate, getFocusScore } from '@/utils/helpers';

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { entries, settings } = useApp();

  const todayKey = getDateKey(new Date(), settings.dayStartHour);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getDateKey(yesterdayDate, settings.dayStartHour);

  const todayEntries = useMemo(() => getEntriesForDate(entries, todayKey), [entries, todayKey]);
  const yesterdayEntries = useMemo(() => getEntriesForDate(entries, yesterdayKey), [entries, yesterdayKey]);

  const todayScore = getFocusScore(todayEntries);
  const yesterdayScore = getFocusScore(yesterdayEntries);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.navHeader, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Timeline Comparison</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Split Screen Container */}
      <View style={styles.splitContainer}>
        {/* Yesterday Column */}
        <View style={[styles.column, { borderRightWidth: 1, borderRightColor: colors.border }]}>
          <View style={[styles.colHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.colTitle, { color: colors.foreground }]}>Yesterday</Text>
            <Text style={[styles.colScore, { color: colors.mutedForeground }]}>Score: {yesterdayScore}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
            {yesterdayEntries.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No entries</Text>
            ) : (
              yesterdayEntries.map(e => <EntryCard key={e.id} entry={e} compact />)
            )}
          </ScrollView>
        </View>

        {/* Today Column */}
        <View style={styles.column}>
          <View style={[styles.colHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.colTitle, { color: colors.primary }]}>Today</Text>
            <Text style={[styles.colScore, { color: colors.primary }]}>Score: {todayScore}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
            {todayEntries.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No entries</Text>
            ) : (
              todayEntries.map(e => <EntryCard key={e.id} entry={e} compact />)
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  colHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  colTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  colScore: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  scrollList: {
    padding: 8,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
