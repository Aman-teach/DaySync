import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { TAGS } from '@/constants/tags';
import { FocusEnergyPicker } from '@/components/FocusEnergyPicker';
import { TagChip } from '@/components/TagChip';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FocusLevel, EnergyLevel } from '@/types';
import { formatTime } from '@/utils/helpers';

export default function EditEntryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, updateEntry, removeEntry } = useApp();

  const entry = entries.find(e => e.id === id);

  const [text, setText] = useState(entry?.text ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(entry?.tags ?? []);
  const [focus, setFocus] = useState<FocusLevel>(entry?.focus ?? 'deep');
  const [energy, setEnergy] = useState<EnergyLevel>(entry?.energy ?? 'high');
  const [saving, setSaving] = useState(false);

  if (!entry) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.prompt, { color: colors.foreground }]}>Entry not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    if (selectedTags.length === 0) {
      Alert.alert('Select a tag', 'Please choose at least one tag.');
      return;
    }
    setSaving(true);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await updateEntry(id!, { text: text.trim(), tags: selectedTags, focus, energy });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeEntry(id!);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 20, 24) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.timeStr, { color: colors.mutedForeground }]}>
              {formatTime(entry.createdAt)}
            </Text>
            <Text style={[styles.prompt, { color: colors.foreground }]}>Edit Entry</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity onPress={handleDelete}>
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <Pressable style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="What were you doing?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
        </Pressable>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TAG</Text>
          <View style={styles.tagGrid}>
            {TAGS.map(tag => (
              <TagChip
                key={tag.id}
                tagId={tag.id}
                selected={selectedTags.includes(tag.id)}
                onPress={() => toggleTag(tag.id)}
                size="md"
              />
            ))}
          </View>
        </View>

        <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FocusEnergyPicker
            focus={focus}
            energy={energy}
            onFocusChange={setFocus}
            onEnergyChange={setEnergy}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  scroll: { padding: 20, gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerBtns: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  timeStr: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  prompt: { fontSize: 20, fontFamily: 'Inter_700Bold', marginTop: 4 },
  inputWrap: { borderRadius: 16, borderWidth: 1, padding: 14, minHeight: 120 },
  input: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 24, minHeight: 96 },
  fieldGroup: { gap: 10 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pickerCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  saveBtn: { paddingVertical: 16, borderRadius: 100, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
