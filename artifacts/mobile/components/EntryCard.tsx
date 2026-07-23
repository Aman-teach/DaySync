import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Entry } from '@/types';
import { formatTime } from '@/utils/helpers';
import { TagChip } from './TagChip';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'react-native';

const FOCUS_COLORS = {
  deep: '#2563EB',
  light: '#06B6D4',
  neutral: '#9CA3AF',
  off: '#64748B',
};

const ENERGY_ICONS = { high: 'H', low: 'L' };

interface Props {
  entry: Entry;
  compact?: boolean;
}

export function EntryCard({ entry, compact }: Props) {
  const colors = useColors();
  const { removeEntry } = useApp();
  const router = useRouter();

  const handleLongPress = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    Alert.alert('Entry', 'What would you like to do?', [
      {
        text: 'Edit',
        onPress: () =>
          router.push({ pathname: '/edit-entry', params: { id: entry.id } }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete entry?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => removeEntry(entry.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePress = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    router.push({ pathname: '/edit-entry', params: { id: entry.id } });
  };

  const dur = entry.intervalMinutes || 30;
  const durStr = dur >= 60 ? (dur % 60 === 0 ? `${dur / 60}h` : `${Math.floor(dur / 60)}h ${dur % 60}m`) : `${dur}m`;

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.row, compact && { paddingRight: 0 }]}>
        {/* Left rail */}
        <View style={styles.rail}>
          <View
            style={[
              styles.dot,
              { backgroundColor: FOCUS_COLORS[entry.focus] },
            ]}
          />
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
            compact && { padding: 8, gap: 4 }
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.time, { color: colors.mutedForeground }, compact && { fontSize: 10 }]}>
              {formatTime(entry.createdAt)} • {durStr}
            </Text>
            <View style={styles.badges}>
              <View
                style={[
                  styles.focusBadge,
                  { backgroundColor: FOCUS_COLORS[entry.focus] + '22', borderColor: FOCUS_COLORS[entry.focus] + '44' },
                  compact && { paddingHorizontal: 4, paddingVertical: 1 }
                ]}
              >
                <Text style={[styles.focusText, { color: FOCUS_COLORS[entry.focus] }, compact && { fontSize: 9 }]}>
                  {entry.focus.charAt(0).toUpperCase() + entry.focus.slice(1)}
                </Text>
              </View>
              {!compact && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View
                    style={[
                      styles.energyBadge,
                      {
                        backgroundColor:
                          entry.energy === 'high' ? '#10B98122' : '#8B5CF622',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.energyText,
                        { color: entry.energy === 'high' ? '#10B981' : '#8B5CF6' },
                      ]}
                    >
                      {entry.energy === 'high' ? 'High' : 'Low'}
                    </Text>
                  </View>
                  {entry.leverage && (
                    <View
                      style={[
                        styles.energyBadge,
                        {
                          backgroundColor:
                            entry.leverage === 'high' ? '#4F46E522' : '#F59E0B22',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.energyText,
                          { color: entry.leverage === 'high' ? '#4F46E5' : '#F59E0B' },
                        ]}
                      >
                        {entry.leverage === 'high' ? '10x Leverage' : 'Busywork'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {entry.text ? (
            <Text
              style={[styles.text, { color: colors.foreground }, compact && { fontSize: 12 }]}
              numberOfLines={compact ? 2 : 3}
            >
              {entry.text}
            </Text>
          ) : null}

          {entry.imageUrl && (
            <View style={{ marginTop: 8 }}>
              <Image 
                source={{ uri: entry.imageUrl }} 
                style={{ width: '100%', height: compact ? 120 : 180, borderRadius: 10, borderWidth: 1, borderColor: colors.border }} 
                resizeMode="cover" 
              />
            </View>
          )}

          {entry.taskTitle && (
            <View style={[styles.linkedTaskBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '33' }]}>
              <Feather name="link" size={10} color={colors.primary} />
              <Text style={[styles.linkedTaskText, { color: colors.primary }]} numberOfLines={1}>
                {entry.taskTitle}
              </Text>
            </View>
          )}

          {(!compact && entry.tags.length > 0) && (
            <View style={styles.tags}>
              {entry.tags.map(t => (
                <TagChip key={t} tagId={t} />
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingRight: 16 },
  rail: { alignItems: 'center', width: 20, paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  badges: { flexDirection: 'row', gap: 6 },
  focusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  focusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  energyBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  energyText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  text: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  linkedTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  linkedTaskText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
  },
});
