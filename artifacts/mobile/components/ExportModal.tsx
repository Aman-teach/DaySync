import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Entry } from '@/types';
import { exportToCSV } from '@/utils/export';
import * as Haptics from 'expo-haptics';

type Preset = '7d' | '30d' | 'thisMonth' | 'thisYear' | 'all' | 'custom';

interface Props {
  visible: boolean;
  entries: Entry[];
  onClose: () => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: (number | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function filterEntries(entries: Entry[], preset: Preset, customFrom: Date | null, customTo: Date | null): Entry[] {
  const now = new Date();
  let from: Date;
  let to: Date = endOfDay(now);

  if (preset === '7d') {
    from = startOfDay(new Date(now.getTime() - 6 * 86400000));
  } else if (preset === '30d') {
    from = startOfDay(new Date(now.getTime() - 29 * 86400000));
  } else if (preset === 'thisMonth') {
    from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  } else if (preset === 'thisYear') {
    from = startOfDay(new Date(now.getFullYear(), 0, 1));
  } else if (preset === 'all') {
    return entries;
  } else {
    // custom
    if (!customFrom) return entries;
    from = startOfDay(customFrom);
    to   = customTo ? endOfDay(customTo) : endOfDay(now);
  }

  return entries.filter(e => {
    const t = new Date(e.createdAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

export function ExportModal({ visible, entries, onClose }: Props) {
  const colors = useColors();
  const [preset, setPreset]       = useState<Preset>('7d');
  const [calYear, setCalYear]     = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]   = useState(new Date().getMonth());
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo,   setCustomTo]   = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);

  const PRESETS: { id: Preset; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: '7d',        label: 'Last 7 days',   icon: 'calendar' },
    { id: '30d',       label: 'Last 30 days',  icon: 'calendar' },
    { id: 'thisMonth', label: 'This month',    icon: 'calendar' },
    { id: 'thisYear',  label: 'This year',     icon: 'calendar' },
    { id: 'all',       label: 'All time',      icon: 'database' },
    { id: 'custom',    label: 'Custom range',  icon: 'sliders' },
  ];

  const filtered = filterEntries(entries, preset, customFrom, customTo);

  const handleExport = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    try {
      await exportToCSV(filtered);
    } catch {}
    setExporting(false);
    onClose();
  };

  const handleDayPress = (day: number | null) => {
    if (!day) return;
    const tapped = new Date(calYear, calMonth, day);
    if (preset !== 'custom') setPreset('custom');
    if (!customFrom || (customFrom && customTo)) {
      setCustomFrom(tapped);
      setCustomTo(null);
    } else {
      if (tapped < customFrom) {
        setCustomTo(customFrom);
        setCustomFrom(tapped);
      } else {
        setCustomTo(tapped);
      }
    }
  };

  const isInRange = (day: number | null): boolean => {
    if (!day || !customFrom) return false;
    const d = new Date(calYear, calMonth, day).getTime();
    if (!customTo) return d === customFrom.getTime();
    return d >= customFrom.getTime() && d <= customTo.getTime();
  };

  const isRangeStart = (day: number | null): boolean => {
    if (!day || !customFrom) return false;
    const d = new Date(calYear, calMonth, day);
    return d.toDateString() === customFrom.toDateString();
  };

  const isRangeEnd = (day: number | null): boolean => {
    if (!day || !customTo) return false;
    const d = new Date(calYear, calMonth, day);
    return d.toDateString() === customTo.toDateString();
  };

  const monthName = new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long' });
  const days = getMonthDays(calYear, calMonth);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Export Data</Text>
              <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} selected
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
            {/* Preset chips */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DATE RANGE</Text>
            <View style={styles.presetGrid}>
              {PRESETS.map(p => {
                const active = preset === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => { setPreset(p.id); try { Haptics.selectionAsync(); } catch {} }}
                  >
                    <Feather name={p.icon} size={12} color={active ? '#fff' : colors.mutedForeground} />
                    <Text style={[styles.presetLabel, { color: active ? '#fff' : colors.foreground }]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Calendar — always visible for custom, collapsed otherwise */}
            {preset === 'custom' && (
              <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Month nav */}
                <View style={styles.calHeader}>
                  <Pressable
                    onPress={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                      else setCalMonth(m => m - 1);
                    }}
                    style={[styles.calNavBtn, { backgroundColor: colors.muted }]}
                  >
                    <Feather name="chevron-left" size={14} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.calMonthLabel, { color: colors.foreground }]}>
                    {monthName} {calYear}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}
                    style={[styles.calNavBtn, { backgroundColor: colors.muted }]}
                  >
                    <Feather name="chevron-right" size={14} color={colors.foreground} />
                  </Pressable>
                </View>

                {/* Day labels */}
                <View style={styles.calDayLabels}>
                  {DAYS.map(d => (
                    <Text key={d} style={[styles.calDayLabel, { color: colors.mutedForeground }]}>{d}</Text>
                  ))}
                </View>

                {/* Calendar grid */}
                <View style={styles.calGrid}>
                  {days.map((day, idx) => {
                    const inRange = isInRange(day);
                    const isStart = isRangeStart(day);
                    const isEnd   = isRangeEnd(day);
                    const isEdge  = isStart || isEnd;
                    return (
                      <Pressable
                        key={idx}
                        style={[
                          styles.calCell,
                          inRange && !isEdge && { backgroundColor: colors.primary + '22' },
                          isEdge && { backgroundColor: colors.primary, borderRadius: 10 },
                          !day && { opacity: 0 },
                        ]}
                        onPress={() => handleDayPress(day)}
                        disabled={!day}
                      >
                        <Text style={[
                          styles.calCellText,
                          { color: isEdge ? '#fff' : inRange ? colors.primary : colors.foreground },
                          !day && { opacity: 0 },
                        ]}>
                          {day ?? ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Range summary */}
                {customFrom && (
                  <View style={[styles.rangeRow, { borderTopColor: colors.border }]}>
                    <View style={styles.rangeDate}>
                      <Text style={[styles.rangeDateLabel, { color: colors.mutedForeground }]}>From</Text>
                      <Text style={[styles.rangeDateValue, { color: colors.foreground }]}>
                        {customFrom.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
                    <View style={styles.rangeDate}>
                      <Text style={[styles.rangeDateLabel, { color: colors.mutedForeground }]}>To</Text>
                      <Text style={[styles.rangeDateValue, { color: colors.foreground }]}>
                        {customTo
                          ? customTo.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Export button */}
            <Pressable
              style={[
                styles.exportBtn,
                { backgroundColor: filtered.length > 0 ? colors.primary : colors.muted },
              ]}
              onPress={handleExport}
              disabled={exporting || filtered.length === 0}
            >
              <Feather name={exporting ? 'loader' : 'download'} size={16} color={filtered.length > 0 ? '#fff' : colors.mutedForeground} />
              <Text style={[styles.exportBtnText, { color: filtered.length > 0 ? '#fff' : colors.mutedForeground }]}>
                {exporting ? 'Exporting…' : `Export ${filtered.length} entries as CSV`}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000066',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  sheetSub:   { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 36, gap: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5,
  },
  presetLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // Calendar
  calCard: {
    borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 12,
  },
  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  calNavBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  calMonthLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  calDayLabels: { flexDirection: 'row' },
  calDayLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  rangeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    borderTopWidth: 1, paddingTop: 12, gap: 8,
  },
  rangeDate: { alignItems: 'center', gap: 2 },
  rangeDateLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  rangeDateValue: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  // Export button
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 18,
  },
  exportBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
