import React, { useRef, useState } from 'react';
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
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { TAGS } from '@/constants/tags';
import { getRandomPrompt } from '@/constants/prompts';
import { FocusEnergyPicker } from '@/components/FocusEnergyPicker';
import { TagChip } from '@/components/TagChip';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FocusLevel, EnergyLevel } from '@/types';

const PROMPT = getRandomPrompt();

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { addEntry, lastFocus, settings } = useApp();

  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [focus, setFocus] = useState<FocusLevel>(lastFocus.focus);
  const [energy, setEnergy] = useState<EnergyLevel>(lastFocus.energy);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const toggleTag = (id: string) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selectedTags.length === 0) {
      Alert.alert('Select a tag', 'Please choose at least one tag before saving.');
      return;
    }
    if (!text.trim() && selectedTags.length === 0) {
      Alert.alert('Add some context', 'Write a quick note about what you were doing.');
      return;
    }
    setSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await addEntry({
      text: text.trim(),
      tags: selectedTags,
      focus,
      energy,
      intervalMinutes: settings.interval,
    });
    router.back();
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Handle bar */}
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 20, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.timeStr, { color: colors.mutedForeground }]}>
              {timeStr} · {settings.interval}min window
            </Text>
            <Text style={[styles.prompt, { color: colors.foreground }]}>{PROMPT}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Text input */}
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.foreground }]}
            placeholder="What were you doing?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
            textAlignVertical="top"
          />
        </Pressable>

        {/* Tags */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              TAG
            </Text>
            {selectedTags.length === 0 && (
              <Text style={[styles.required, { color: colors.destructive }]}>required</Text>
            )}
          </View>
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

        {/* Focus + Energy */}
        <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FocusEnergyPicker
            focus={focus}
            energy={energy}
            onFocusChange={setFocus}
            onEnergyChange={setEnergy}
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor:
                selectedTags.length > 0 ? colors.primary : colors.muted,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.saveBtnText,
              {
                color: selectedTags.length > 0 ? '#fff' : colors.mutedForeground,
              },
            ]}
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  scroll: { padding: 20, gap: 18 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeStr: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  prompt: { fontSize: 20, fontFamily: 'Inter_700Bold', marginTop: 4, lineHeight: 28, flex: 1 },
  inputWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 120,
  },
  input: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    minHeight: 96,
  },
  fieldGroup: { gap: 10 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  required: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pickerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
