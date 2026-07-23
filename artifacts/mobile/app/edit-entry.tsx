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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { uploadImageToAppwrite } from '@/utils/upload';
import { FocusEnergyPicker } from '@/components/FocusEnergyPicker';
import { TagChip } from '@/components/TagChip';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { FocusLevel, EnergyLevel } from '@/types';
import { formatTime } from '@/utils/helpers';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export default function EditEntryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, updateEntry, removeEntry, tags, tasks } = useApp();

  const entry = entries.find(e => e.id === id);

  const [text, setText] = useState(entry?.text ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(entry?.tags ?? []);
  const [focus, setFocus] = useState<FocusLevel>(entry?.focus ?? 'deep');
  const [energy, setEnergy] = useState<EnergyLevel>(entry?.energy ?? 'high');
  const [leverage, setLeverage] = useState<'high' | 'busywork' | undefined>(entry?.leverage);
  const [customDuration, setCustomDuration] = useState<number | undefined>(entry?.intervalMinutes);
  const [taskId, setTaskId] = useState<string | undefined>(entry?.taskId);
  const [taskTitle, setTaskTitle] = useState<string | undefined>(entry?.taskTitle);
  const [imageUrl, setImageUrl] = useState<string | undefined>(entry?.imageUrl);
  const [showTaskList, setShowTaskList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    
    let finalImageUrl = imageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      const uploadedUrl = await uploadImageToAppwrite(imageUrl);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        Alert.alert('Upload Failed', 'Could not upload your photo to Appwrite. Saving without it.');
        finalImageUrl = undefined;
      }
    }

    await updateEntry(id!, { text: text.trim(), tags: selectedTags, focus, energy, leverage, intervalMinutes: customDuration, taskId, taskTitle, imageUrl: finalImageUrl });
    router.back();
  };

  const handleAttachPhoto = () => {
    if (Platform.OS === 'web') {
      pickImage(false);
      return;
    }
    Alert.alert('Attach Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Allow camera access to take a photo.');
          return;
        }
      }
      
      let result = useCamera 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          });

      if (!result.canceled) {
        setImageUrl(result.assets[0].uri);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    await removeEntry(id!);
    router.back();
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
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 12 }}>
            <TouchableOpacity 
              onPress={handleAttachPhoto} 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}
            >
              <Feather name="camera" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{imageUrl ? 'Change Photo' : 'Attach Photo'}</Text>
            </TouchableOpacity>
          </View>
          
          {imageUrl && (
            <View style={{ marginTop: 16, position: 'relative' }}>
              <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 220, borderRadius: 12 }} resizeMode="cover" />
              <TouchableOpacity 
                onPress={() => setImageUrl(undefined)}
                style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 100 }}
              >
                <Feather name="x" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </Pressable>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TAG</Text>
          <View style={styles.tagGrid}>
            {tags.map(tag => (
              <TagChip
                key={tag.id}
                tagId={tag.id}
                tag={tag}
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

        {/* Leverage */}
        <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>WORK QUALITY</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={[
                { flex: 1, paddingHorizontal: 6, borderRadius: 100, borderWidth: leverage === 'high' ? 0 : 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: leverage === 'high' ? 9.5 : 8 },
                leverage === 'high' 
                  ? { backgroundColor: '#4F46E5', borderColor: '#4F46E5' } // Indigo
                  : { backgroundColor: colors.card, borderColor: colors.border }
              ]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setLeverage(leverage === 'high' ? undefined : 'high');
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Feather name="zap" size={15} color={leverage === 'high' ? '#fff' : colors.mutedForeground} />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: leverage === 'high' ? '#fff' : colors.foreground }}>10x Leverage</Text>
              </View>
            </Pressable>
            <Pressable
               style={[
                { flex: 1, paddingHorizontal: 6, borderRadius: 100, borderWidth: leverage === 'busywork' ? 0 : 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: leverage === 'busywork' ? 9.5 : 8 },
                leverage === 'busywork' 
                  ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' } // Amber
                  : { backgroundColor: colors.card, borderColor: colors.border }
              ]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setLeverage(leverage === 'busywork' ? undefined : 'busywork');
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Feather name="clock" size={15} color={leverage === 'busywork' ? '#fff' : colors.mutedForeground} />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: leverage === 'busywork' ? '#fff' : colors.foreground }}>Busywork</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Override Duration */}
        <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>DURATION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[15, 30, 45, 60, 90, 120, 180].map(dur => (
              <Pressable
                key={dur}
                style={[
                  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
                  customDuration === dur 
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setCustomDuration(customDuration === dur ? undefined : dur);
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: customDuration === dur ? '#fff' : colors.foreground }}>
                  {dur >= 60 ? (dur % 60 === 0 ? `${dur / 60}h` : `${Math.floor(dur / 60)}h ${dur % 60}m`) : `${dur}m`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* AtlasOS Task Linker */}
        {tasks.length > 0 && (
          <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.taskDropdownToggle}
              onPress={() => setShowTaskList(!showTaskList)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Feather
                  name={taskId ? 'link-2' : 'link'}
                  size={16}
                  color={taskId ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[styles.taskDropdownText, { color: taskId ? colors.primary : colors.foreground }]}
                  numberOfLines={1}
                >
                  {taskId ? taskTitle : 'Link an AtlasOS Task...'}
                </Text>
              </View>
              <Feather
                name={showTaskList ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showTaskList && (
              <View style={[styles.taskListContainer, { borderTopColor: colors.border }]}>
                {taskId && (
                  <TouchableOpacity
                    style={[styles.taskListItem, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={() => {
                      setTaskId(undefined);
                      setTaskTitle(undefined);
                      setShowTaskList(false);
                    }}
                  >
                    <Feather name="x" size={14} color={colors.destructive} />
                    <Text style={[styles.taskListText, { color: colors.destructive }]}>
                      Clear selection
                    </Text>
                  </TouchableOpacity>
                )}
                {tasks.map(task => {
                  const isSelected = taskId === task.id;
                  const isDone = task.status === 'done';
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        styles.taskListItem,
                        {
                          backgroundColor: isSelected ? colors.primary + '15' : colors.card,
                          borderColor: isSelected ? colors.primary + '55' : colors.border,
                          borderWidth: 1,
                        }
                      ]}
                      onPress={() => {
                        setTaskId(task.id);
                        setTaskTitle(task.title);
                        setShowTaskList(false);
                      }}
                    >
                      <Feather
                        name={isSelected ? 'check-circle' : (isDone ? 'check' : 'circle')}
                        size={14}
                        color={isSelected || isDone ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[styles.taskListText, { color: isSelected ? colors.primary : colors.foreground }]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <DeleteConfirmModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
      />
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
  taskDropdownToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  taskDropdownText: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1 },
  taskListContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  taskListItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  taskListText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
});
