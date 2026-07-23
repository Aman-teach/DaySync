import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getFocusScore, getDateKey } from '@/utils/helpers';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { entries, daySummaries, settings } = useApp();

  const [timeFilter, setTimeFilter] = useState<'7' | '30' | 'all'>('7');

  const historyList = useMemo(() => {
    const today = new Date();
    const todayKey = getDateKey(today, settings.dayStartHour);
    
    // Group entries by dateKey
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.dateKey]) {
        acc[entry.dateKey] = [];
      }
      acc[entry.dateKey].push(entry);
      return acc;
    }, {} as Record<string, typeof entries>);

    // Convert to array and filter
    let list = Object.entries(grouped)
      .map(([dateKey, dayEntries]) => {
        const score = getFocusScore(dayEntries);
        const hasWrap = daySummaries.some(s => s.dateKey === dateKey);
        
        const [yyyy, mm, dd] = dateKey.split('-');
        const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
        
        return {
          dateKey,
          entriesCount: dayEntries.length,
          score,
          hasWrap,
          dateObj,
          isToday: dateKey === todayKey,
        };
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    if (timeFilter !== 'all') {
      const days = parseInt(timeFilter);
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter(item => item.dateObj >= cutoff);
    }

    return list;
  }, [entries, daySummaries, settings.dayStartHour, timeFilter]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Review your past timelines and execution guides.
          </Text>
        </View>

        {/* Time Filters */}
        <View style={[styles.filterBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['7', '30', 'all'] as const).map(f => {
            const isActive = timeFilter === f;
            const label = f === '7' ? 'Last 7 Days' : f === '30' ? 'Last 30 Days' : 'All Time';
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, isActive && { backgroundColor: colors.primary }]}
                onPress={() => setTimeFilter(f)}
              >
                <Text style={[styles.filterText, isActive ? { color: '#fff' } : { color: colors.mutedForeground }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.compareBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/compare')}
          activeOpacity={0.8}
        >
          <Feather name="columns" size={16} color="#fff" />
          <Text style={styles.compareBtnText}>Compare Today vs Yesterday</Text>
        </TouchableOpacity>

        {historyList.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clock" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No History</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Your past logs will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {historyList.map((item) => (
              <TouchableOpacity
                key={item.dateKey}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/history/[date]', params: { date: item.dateKey } } as any)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardDate, { color: colors.foreground }]}>
                    {item.isToday ? "Today" : item.dateObj.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                  {item.hasWrap && (
                    <View style={[styles.wrapBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Feather name="zap" size={12} color={colors.primary} />
                      <Text style={[styles.wrapBadgeText, { color: colors.primary }]}>Wrap</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.cardStats}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{item.entriesCount}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Entries</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{item.score}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Focus Score</Text>
                  </View>
                </View>
                
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={styles.chevron} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 24 },
  header: { gap: 4, marginBottom: 8 },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  
  emptyState: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  compareBtn: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  compareBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },

  list: { gap: 12 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardDate: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  wrapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wrapBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 24,
  },
  statBox: {
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
});
