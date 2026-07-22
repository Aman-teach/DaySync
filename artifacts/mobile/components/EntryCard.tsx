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

const FOCUS_COLORS = {
  deep: '#2D6A4F',
  light: '#E8A838',
  off: '#9CA3AF',
};

const ENERGY_ICONS = { high: 'H', low: 'L' };

interface Props {
  entry: Entry;
}

export function EntryCard({ entry }: Props) {
  const colors = useColors();
  const { removeEntry } = useApp();
  const router = useRouter();

  const handleLongPress = () => {
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

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      onPress={() =>
        router.push({ pathname: '/edit-entry', params: { id: entry.id } })
      }
      activeOpacity={0.8}
    >
      <View style={[styles.row]}>
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
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatTime(entry.createdAt)}
            </Text>
            <View style={styles.badges}>
              <View
                style={[
                  styles.focusBadge,
                  { backgroundColor: FOCUS_COLORS[entry.focus] + '22', borderColor: FOCUS_COLORS[entry.focus] + '44' },
                ]}
              >
                <Text style={[styles.focusText, { color: FOCUS_COLORS[entry.focus] }]}>
                  {entry.focus.charAt(0).toUpperCase() + entry.focus.slice(1)}
                </Text>
              </View>
              <View
                style={[
                  styles.energyBadge,
                  {
                    backgroundColor:
                      entry.energy === 'high' ? '#FFF3DC' : '#F0F0F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.energyText,
                    { color: entry.energy === 'high' ? '#C07A00' : '#888' },
                  ]}
                >
                  {entry.energy === 'high' ? 'High' : 'Low'}
                </Text>
              </View>
            </View>
          </View>

          {entry.text ? (
            <Text
              style={[styles.text, { color: colors.foreground }]}
              numberOfLines={3}
            >
              {entry.text}
            </Text>
          ) : null}

          {entry.tags.length > 0 && (
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
});
