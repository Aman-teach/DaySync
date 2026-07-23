import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { TagConfig } from '@/constants/tags';
import { useApp } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';

// ─── Curated icon options ───────────────────────────────────────────────────
const ICON_OPTIONS: (keyof typeof Feather.glyphMap)[] = [
  'zap', 'briefcase', 'users', 'activity', 'coffee', 'message-circle',
  'clipboard', 'book-open', 'book', 'edit-2', 'calendar', 'heart',
  'code', 'music', 'camera', 'shopping-bag', 'truck', 'home',
  'film', 'headphones', 'star', 'phone', 'mail', 'globe',
  'cpu', 'layers', 'map', 'sun', 'moon', 'target',
  'trending-up', 'award', 'flag', 'box', 'tool', 'feather',
];

// ─── Curated color palettes (color + bg pairs) ─────────────────────────────
const COLOR_OPTIONS = [
  { color: '#1B4332', bg: '#B7E4C7' },
  { color: '#1A5276', bg: '#D6EAF8' },
  { color: '#6C3483', bg: '#E8DAEF' },
  { color: '#7D6608', bg: '#FEF3C7' },
  { color: '#0E6655', bg: '#D1F2EB' },
  { color: '#922B21', bg: '#FADBD8' },
  { color: '#5D4037', bg: '#EFEBE9' },
  { color: '#4A235A', bg: '#F5EEF8' },
  { color: '#784212', bg: '#FDF2E9' },
  { color: '#154360', bg: '#D6EAF8' },
  { color: '#7B241C', bg: '#FDEDEC' },
  { color: '#1A6347', bg: '#D5F5E3' },
  { color: '#B7950B', bg: '#FDEBD0' },
  { color: '#1F618D', bg: '#EBF5FB' },
  { color: '#6E2F8A', bg: '#F4ECF7' },
  { color: '#117A65', bg: '#E8F8F5' },
  { color: '#DC2626', bg: '#FEE2E2' },
  { color: '#1D4ED8', bg: '#DBEAFE' },
  { color: '#047857', bg: '#D1FAE5' },
  { color: '#7C3AED', bg: '#EDE9FE' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TagManagerModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { tags, addTag, removeTag, updateTag } = useApp();

  // Create/Edit state
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingTag, setEditingTag] = useState<TagConfig | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Feather.glyphMap>('star');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  const resetForm = () => {
    setLabel('');
    setSelectedIcon('star');
    setSelectedColor(COLOR_OPTIONS[0]);
    setEditingTag(null);
  };

  const openCreate = () => {
    resetForm();
    setMode('create');
  };

  const openEdit = (tag: TagConfig) => {
    setLabel(tag.label);
    setSelectedIcon(tag.icon);
    const match = COLOR_OPTIONS.find(c => c.color === tag.color) ?? COLOR_OPTIONS[0];
    setSelectedColor(match);
    setEditingTag(tag);
    setMode('edit');
  };

  const handleSave = async () => {
    if (!label.trim()) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    const tag: TagConfig = {
      id: editingTag?.id ?? label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      label: label.trim(),
      icon: selectedIcon,
      color: selectedColor.color,
      bg: selectedColor.bg,
    };
    if (mode === 'edit') {
      await updateTag(tag);
    } else {
      await addTag(tag);
    }
    resetForm();
    setMode('list');
  };

  const handleDelete = async (id: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    await removeTag(id);
  };

  const isForm = mode === 'create' || mode === 'edit';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={isForm ? undefined : onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              {isForm && (
                <Pressable onPress={() => { resetForm(); setMode('list'); }} style={styles.backBtn}>
                  <Feather name="arrow-left" size={16} color={colors.foreground} />
                </Pressable>
              )}
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  {mode === 'list' ? 'Manage Tags' : mode === 'create' ? 'New Tag' : 'Edit Tag'}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                  {mode === 'list' ? `${tags.length} tags` : 'Customize your tag'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
            {/* ── LIST MODE ── */}
            {mode === 'list' && (
              <>
                {/* Tag list */}
                <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {tags.map((tag, idx) => (
                    <View
                      key={tag.id}
                      style={[
                        styles.tagRow,
                        idx < tags.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                      ]}
                    >
                      {/* Icon badge */}
                      <View style={[styles.tagIconBadge, { backgroundColor: tag.bg }]}>
                        <Feather name={tag.icon} size={14} color={tag.color} />
                      </View>
                      <Text style={[styles.tagLabel, { color: colors.foreground }]}>{tag.label}</Text>
                      <View style={styles.tagActions}>
                        <Pressable
                          onPress={() => openEdit(tag)}
                          style={[styles.tagActionBtn, { backgroundColor: colors.muted }]}
                        >
                          <Feather name="edit-2" size={12} color={colors.mutedForeground} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(tag.id)}
                          style={[styles.tagActionBtn, { backgroundColor: '#FEE2E2' }]}
                        >
                          <Feather name="trash-2" size={12} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Add button */}
                <Pressable
                  onPress={openCreate}
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.addBtnText}>Add New Tag</Text>
                </Pressable>
              </>
            )}

            {/* ── CREATE / EDIT MODE ── */}
            {isForm && (
              <>
                {/* Preview */}
                <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREVIEW</Text>
                  <View style={styles.previewChip}>
                    <View style={[styles.chip, { backgroundColor: selectedColor.bg }]}>
                      <Feather name={selectedIcon} size={13} color={selectedColor.color} />
                      <Text style={[styles.chipLabel, { color: selectedColor.color }]}>
                        {label || 'My Tag'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Label input */}
                <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LABEL</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Tag name…"
                    placeholderTextColor={colors.mutedForeground + '88'}
                    value={label}
                    onChangeText={setLabel}
                    maxLength={20}
                    autoFocus={mode === 'create'}
                    selectionColor={colors.primary}
                  />
                </View>

                {/* Icon picker */}
                <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ICON</Text>
                  <View style={styles.iconGrid}>
                    {ICON_OPTIONS.map(icon => {
                      const active = selectedIcon === icon;
                      return (
                        <Pressable
                          key={icon}
                          onPress={() => { setSelectedIcon(icon); try { Haptics.selectionAsync(); } catch {} }}
                          style={[
                            styles.iconCell,
                            {
                              backgroundColor: active ? colors.primary : colors.muted,
                              borderColor: active ? colors.primary : 'transparent',
                            },
                          ]}
                        >
                          <Feather name={icon} size={16} color={active ? '#fff' : colors.mutedForeground} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Color picker */}
                <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>COLOR</Text>
                  <View style={styles.colorGrid}>
                    {COLOR_OPTIONS.map((c, idx) => {
                      const active = selectedColor.color === c.color;
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => { setSelectedColor(c); try { Haptics.selectionAsync(); } catch {} }}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: c.color },
                            active && styles.colorSwatchActive,
                          ]}
                        >
                          {active && <Feather name="check" size={12} color="#fff" />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Save button */}
                <Pressable
                  onPress={handleSave}
                  style={[styles.saveBtn, { backgroundColor: label.trim() ? colors.primary : colors.muted }]}
                  disabled={!label.trim()}
                >
                  <Feather name="check" size={16} color={label.trim() ? '#fff' : colors.mutedForeground} />
                  <Text style={[styles.saveBtnText, { color: label.trim() ? '#fff' : colors.mutedForeground }]}>
                    {mode === 'edit' ? 'Save Changes' : 'Create Tag'}
                  </Text>
                </Pressable>
              </>
            )}
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
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#00000011',
  },
  sheetTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  sheetSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 40, gap: 14 },

  // List
  listCard: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden' },
  tagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  tagIconBadge: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tagLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  tagActions: { flexDirection: 'row', gap: 6 },
  tagActionBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 18,
  },
  addBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },

  // Form
  previewCard: { borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 10, alignItems: 'center' },
  previewChip: { paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, alignSelf: 'center',
  },
  chipLabel: { fontSize: 14, fontFamily: 'Inter_700Bold' },

  inputCard: { borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 10 },
  input: {
    fontSize: 16, fontFamily: 'Inter_400Regular',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as object : {}),
  },

  pickerCard: { borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 18,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
