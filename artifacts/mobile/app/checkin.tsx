/**
 * Check-in modal — completely redesigned premium UI
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import {
  Alert,
  Dimensions,
  Keyboard,
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
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { uploadImageToAppwrite, uploadAudioToAppwrite } from '@/utils/upload';
import { saveCheckinDraft, loadCheckinDraft, clearCheckinDraft } from '@/utils/storage';
import { getRandomPrompt } from '@/constants/prompts';
import { FocusEnergyPicker } from '@/components/FocusEnergyPicker';
import { TagChip } from '@/components/TagChip';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { FocusLevel, EnergyLevel } from '@/types';
import { functions, APPWRITE_CONFIG, ExecutionMethod } from '@/lib/appwrite';

type VoiceState = 'idle' | 'recording' | 'processing' | 'transcribed';
type Mode = 'text' | 'voice';

const PROMPT = getRandomPrompt();
const { width: SW } = Dimensions.get('screen');

// ─── Pulse ring ──────────────────────────────────────────────────────────────
function PulseRing({ delay, active }: { delay: number; active: boolean }) {
  const scale   = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value   = withDelay(delay, withRepeat(withTiming(1, { duration: 1700 }), -1, false));
      opacity.value = withDelay(delay, withRepeat(
        withSequence(withTiming(0.4, { duration: 150 }), withTiming(0, { duration: 1550 })),
        -1, false
      ));
    } else {
      scale.value   = withTiming(0.4, { duration: 250 });
      opacity.value = withTiming(0,   { duration: 250 });
    }
  }, [active]);

  const s = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <Animated.View pointerEvents="none" style={[styles.pulseRing, s]} />;
}

// ─── Mode tab pill ───────────────────────────────────────────────────────────
function ModeTabs({
  mode,
  onSwitch,
  disabled,
  isRecording,
}: {
  mode: Mode;
  onSwitch: (m: Mode) => void;
  disabled?: boolean;
  isRecording?: boolean;
}) {
  const colors  = useColors();
  const pillX   = useSharedValue(mode === 'text' ? 0 : 1);
  const mounted = useRef(false);

  useEffect(() => {
    const target = mode === 'text' ? 0 : 1;
    if (!mounted.current) { pillX.value = target; mounted.current = true; return; }
    pillX.value = withSpring(target, { damping: 20, stiffness: 320 });
  }, [mode]);

  const PILL_W = 86;
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value * PILL_W }],
  }));

  const labelColor = (active: boolean) =>
    isRecording
      ? active ? '#fff' : '#ffffff70'
      : active ? colors.foreground : colors.mutedForeground;

  return (
    <View style={[styles.tabs, { backgroundColor: isRecording ? '#ffffff18' : colors.muted }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tabPill,
          { backgroundColor: isRecording ? '#ffffff25' : colors.background },
          pillStyle,
        ]}
      />
      {(['text', 'voice'] as Mode[]).map(m => (
        <Pressable
          key={m}
          style={styles.tabBtn}
          onPress={() => { if (!disabled) onSwitch(m); }}
        >
          <Feather
            name={m === 'text' ? 'edit-2' : 'mic'}
            size={12}
            color={labelColor(mode === m)}
          />
          <Text style={[styles.tabLabel, { color: labelColor(mode === m), fontFamily: mode === m ? 'Inter_700Bold' : 'Inter_400Regular' }]}>
            {m === 'text' ? 'Text' : 'Voice'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { addEntry, lastFocus, settings, tags, tasks, entries } = useApp();

  const { mode: initialMode, autoStart } = useLocalSearchParams<{ mode: Mode; autoStart?: string }>();
  const [mode,        setMode]        = useState<Mode>(initialMode ?? 'text');
  const [step,        setStep]        = useState<1 | 2>(1);
  const [voiceState,  setVoiceState]  = useState<VoiceState>('idle');
  const [text,        setText]        = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [focus,  setFocus]  = useState<FocusLevel>(lastFocus.focus);
  const [energy, setEnergy] = useState<EnergyLevel>(lastFocus.energy);
  const [leverage, setLeverage] = useState<'high' | 'busywork' | undefined>();
  const [customDuration, setCustomDuration] = useState<number | undefined>();
  const [taskId, setTaskId] = useState<string | undefined>();
  const [taskTitle, setTaskTitle] = useState<string | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [showTaskList, setShowTaskList] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [txError,   setTxError]   = useState('');

  const recordingRef  = useRef<any>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef      = useRef<TextInput>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up recording if unmounted
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // ── Restore draft on mount (handles OS app-kill while in gallery) ──────────
  useEffect(() => {
    loadCheckinDraft().then(draft => {
      if (!draft) return;
      if (draft.text)          setText(draft.text);
      if (draft.selectedTags?.length) setSelectedTags(draft.selectedTags);
      if (draft.focus)         setFocus(draft.focus as FocusLevel);
      if (draft.energy)        setEnergy(draft.energy as EnergyLevel);
      if (draft.leverage)      setLeverage(draft.leverage as 'high' | 'busywork');
      if (draft.customDuration) setCustomDuration(draft.customDuration);
      if (draft.taskId)        setTaskId(draft.taskId);
      if (draft.taskTitle)     setTaskTitle(draft.taskTitle);
      if (draft.imageUrl)      setImageUrl(draft.imageUrl);
    });
  }, []);

  // Animations
  const greenAnim  = useSharedValue(0);
  const micScale   = useSharedValue(1);
  const saveScale  = useSharedValue(1);

  // ── Auto-save draft whenever any field changes (debounced 500ms) ──────────
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      // Only persist remote URLs — local temp URIs are ephemeral and will break after OS cache clean
      const persistedImageUrl = imageUrl?.startsWith('https://') ? imageUrl : undefined;
      saveCheckinDraft({ text, selectedTags, focus, energy, leverage, customDuration, taskId, taskTitle, imageUrl: persistedImageUrl });
    }, 500);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [text, selectedTags, focus, energy, leverage, customDuration, taskId, taskTitle, imageUrl]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
    }
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      greenAnim.value, [0, 1], [colors.background, '#1B4332']
    ),
  }));

  const startRecording = useCallback(async () => {
    if (voiceState === 'recording') return;
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone access to record audio.');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setVoiceState('recording');
      setTxError('');
      setElapsed(0);
      greenAnim.value = withTiming(1, { duration: 500 });
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    } catch (e) {
      console.log('Failed to start recording', e);
      recordingRef.current = null;
    }
  }, [greenAnim, micScale]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    setVoiceState('processing');
    greenAnim.value = withTiming(0, { duration: 420 });

    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        
        if (uri) {
          // Upload and transcribe
          const uploadedUrl = await uploadAudioToAppwrite(uri);
          if (uploadedUrl) {
            const execution = await functions.createExecution(
              APPWRITE_CONFIG.FUNCTIONS.TRANSCRIBE,
              JSON.stringify({ fileUrl: uploadedUrl }),
              false,
              '/v1/executions',
              ExecutionMethod.POST,
              { 'Content-Type': 'application/json' }
            );

            if (execution.status === 'completed') {
              const res = JSON.parse(execution.responseBody);
              setText(prev => (prev ? prev + ' ' + res.text : res.text));
              try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            } else {
              setTxError('Transcription failed.');
            }
          } else {
            setTxError('Could not upload audio.');
          }
        }
      }
      setVoiceState('transcribed');
    } catch (e: any) {
      setTxError(e.message || 'Could not stop recording');
      setVoiceState('transcribed');
    }
  }, [greenAnim, text]);

  // Auto-start recording if triggered from Speed Dial
  useEffect(() => {
    if (autoStart === 'true' && voiceState === 'idle') {
      startRecording();
    }
  }, [autoStart, startRecording]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selectedTags.length === 0) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert('Pick a tag', 'Choose at least one activity before saving.');
      return;
    }
    saveScale.value = withSequence(
      withSpring(0.94, { damping: 8, stiffness: 300 }),
      withSpring(1,    { damping: 9, stiffness: 250 })
    );
    setSaving(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    
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

    await addEntry({ 
      text: text.trim(), 
      tags: selectedTags, 
      focus, 
      energy,
      leverage,
      intervalMinutes: customDuration || settings.interval,
      taskId,
      taskTitle,
      imageUrl: finalImageUrl,
    });
    await clearCheckinDraft();
    router.back();
  };

  const toggleTag = (id: string) => {
    try { Haptics.selectionAsync(); } catch {}
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const switchMode = (next: Mode) => {
    if (next === mode || voiceState === 'recording') return;
    setMode(next);
    setVoiceState('idle');
    Keyboard.dismiss();
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

  const isRecording  = voiceState === 'recording';
  const isProcessing = voiceState === 'processing';

  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const mm      = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss      = String(elapsed % 60).padStart(2, '0');

  const saveBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));
  const micBtnStyle  = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value  }] }));

  // Personality Additions
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';
  const primaryTag = selectedTags.length > 0 ? tags.find(t => t.id === selectedTags[0]) : null;

  let activityHeader = 'Where are you spending your time?';
  const lastEntry = entries[0];
  if (lastEntry) {
    const diffMs = now.getTime() - new Date(lastEntry.createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60 && diffMins > 0) {
      activityHeader = `What did you do for the last ${diffMins}m?`;
    } else if (diffMins >= 60 && diffMins < 24 * 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      activityHeader = `What did you do for the last ${timeStr}?`;
    }
  }

  // ── Shared bottom form ─────────────────────────────────────────────────────
  const bottomForm = (
    <>
      {/* Personalized Greeting */}
      <View style={{ paddingHorizontal: 4, marginBottom: 16, marginTop: 4 }}>
        <Text style={{ fontSize: 24, fontFamily: 'Inter_400Regular', color: isRecording ? '#ffffff' : colors.foreground, letterSpacing: -0.5 }}>
          {greeting}, Aman.
        </Text>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_400Regular', color: isRecording ? '#ffffffaa' : colors.mutedForeground, marginTop: 2 }}>
          {lastEntry ? 'Ready to log your next session?' : "Let's log your first session."}
        </Text>
      </View>

      {/* Tags */}
      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <View style={styles.formCardTitleRow}>
            <Feather name="tag" size={13} color={isRecording ? '#fff' : colors.primary} />
            <Text style={[styles.formCardTitle, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>
              {activityHeader}
            </Text>
          </View>
          {selectedTags.length === 0 && (
            <View style={styles.requiredPill}>
              <Text style={styles.requiredText}>required</Text>
            </View>
          )}
          {selectedTags.length > 0 && (
            <View style={[styles.donePill, { backgroundColor: colors.primary + '22' }]}>
              <Feather name="check" size={10} color={colors.primary} />
              <Text style={[styles.doneText, { color: colors.primary }]}>{selectedTags.length} selected</Text>
            </View>
          )}
        </View>
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

      {tasks.length > 0 && (
        <>
          <View style={{ height: 1, backgroundColor: isRecording ? '#ffffff15' : colors.border, marginVertical: 4 }} />
          {/* AtlasOS Task Linker */}
          <View style={styles.formCard}>
          <TouchableOpacity
            style={styles.taskDropdownToggle}
            onPress={() => setShowTaskList(!showTaskList)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Feather
                name={taskId ? 'link-2' : 'link'}
                size={16}
                color={taskId ? (isRecording ? '#fff' : colors.primary) : (isRecording ? '#ffffffcc' : colors.mutedForeground)}
              />
              <Text
                style={[styles.taskDropdownText, { color: taskId ? (isRecording ? '#fff' : colors.primary) : (isRecording ? '#ffffffcc' : colors.foreground) }]}
                numberOfLines={1}
              >
                {taskId ? taskTitle : 'Link an AtlasOS Task...'}
              </Text>
            </View>
            <Feather
              name={showTaskList ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={isRecording ? '#ffffffcc' : colors.mutedForeground}
            />
          </TouchableOpacity>

          {showTaskList && (
            <View style={[styles.taskListContainer, { borderTopColor: isRecording ? '#ffffff33' : colors.border }]}>
              {taskId && (
                <TouchableOpacity
                  style={[styles.taskListItem, { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border, borderWidth: 1 }]}
                  onPress={() => {
                    setTaskId(undefined);
                    setTaskTitle(undefined);
                    setShowTaskList(false);
                  }}
                >
                  <Feather name="x" size={14} color={isRecording ? '#ff8888' : colors.destructive} />
                  <Text style={[styles.taskListText, { color: isRecording ? '#ff8888' : colors.destructive }]}>
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
                        backgroundColor: isSelected ? (isRecording ? '#ffffff22' : colors.primary + '15') : (isRecording ? '#ffffff11' : colors.card),
                        borderColor: isSelected ? (isRecording ? '#ffffff55' : colors.primary + '55') : (isRecording ? '#ffffff22' : colors.border),
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
                      color={isSelected || isDone ? (isRecording ? '#fff' : colors.primary) : (isRecording ? '#ffffff66' : colors.mutedForeground)}
                    />
                    <Text
                      style={[styles.taskListText, { color: isSelected ? (isRecording ? '#fff' : colors.primary) : (isRecording ? '#ffffffcc' : colors.foreground) }]}
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
        </>
      )}

      <View style={{ height: 1, backgroundColor: isRecording ? '#ffffff15' : colors.border, marginVertical: 4 }} />

      {/* Focus + energy */}
      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <View style={styles.formCardTitleRow}>
            <Feather name="bar-chart-2" size={13} color={isRecording ? '#fff' : colors.primary} />
            <Text style={[styles.formCardTitle, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>
              How did it feel?
            </Text>
          </View>
        </View>
        <FocusEnergyPicker
          focus={focus}
          energy={energy}
          onFocusChange={setFocus}
          onEnergyChange={setEnergy}
          isRecording={isRecording}
        />
      </View>

      <View style={{ height: 1, backgroundColor: isRecording ? '#ffffff15' : colors.border, marginVertical: 4 }} />

      {/* Leverage */}
      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <View style={styles.formCardTitleRow}>
            <Feather name="trending-up" size={13} color={isRecording ? '#fff' : colors.primary} />
            <Text style={[styles.formCardTitle, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>
              Were you doing high-leverage work or busywork?
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={[
              { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 100, borderWidth: leverage === 'high' ? 0 : 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: leverage === 'high' ? 9.5 : 8 },
              leverage === 'high' 
                ? { backgroundColor: '#4F46E5', borderColor: '#4F46E5' } // Indigo
                : { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }
            ]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setLeverage(leverage === 'high' ? undefined : 'high');
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Feather name="zap" size={15} color={leverage === 'high' ? '#fff' : (isRecording ? '#ffffffcc' : colors.mutedForeground)} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: leverage === 'high' ? '#fff' : (isRecording ? '#ffffffcc' : colors.foreground) }}>10x Leverage</Text>
            </View>
          </Pressable>
          <Pressable
             style={[
              { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 100, borderWidth: leverage === 'busywork' ? 0 : 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: leverage === 'busywork' ? 9.5 : 8 },
              leverage === 'busywork' 
                ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' } // Amber
                : { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }
            ]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setLeverage(leverage === 'busywork' ? undefined : 'busywork');
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Feather name="clock" size={15} color={leverage === 'busywork' ? '#fff' : (isRecording ? '#ffffffcc' : colors.mutedForeground)} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: leverage === 'busywork' ? '#fff' : (isRecording ? '#ffffffcc' : colors.foreground) }}>Busywork</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: isRecording ? '#ffffff15' : colors.border, marginVertical: 4 }} />

      {/* Override Duration */}
      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <View style={styles.formCardTitleRow}>
            <Feather name="clock" size={13} color={isRecording ? '#fff' : colors.primary} />
            <Text style={[styles.formCardTitle, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>
              Are you logging a past session?
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[15, 30, 45, 60, 90, 120, 180].map(dur => (
            <Pressable
              key={dur}
              style={[
                { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
                customDuration === dur 
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setCustomDuration(customDuration === dur ? undefined : dur);
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: customDuration === dur ? '#fff' : (isRecording ? '#ffffffcc' : colors.foreground) }}>
                {dur >= 60 ? (dur % 60 === 0 ? `${dur / 60}h` : `${Math.floor(dur / 60)}h ${dur % 60}m`) : `${dur}m`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>


    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.root, bgStyle]}>
      {/* Handle */}
      <View style={[styles.handle, { backgroundColor: isRecording ? '#ffffff44' : colors.border }]} />

      {/* Top bar */}
      <View style={styles.topBar}>
        {step === 1 ? (
          <ModeTabs mode={mode} onSwitch={switchMode} disabled={isRecording} isRecording={isRecording} />
        ) : (
          <TouchableOpacity 
            onPress={() => setStep(1)} 
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.card, borderRadius: 100, borderWidth: 1, borderColor: colors.border }}
          >
            <Feather name="arrow-left" size={14} color={colors.foreground} />
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.topRight}>
          <Text style={[styles.clock, { color: isRecording ? '#ffffffaa' : colors.mutedForeground }]}>
            {timeStr}
          </Text>
          <Pressable
            onPress={() => { if (isRecording) stopRecording(); clearCheckinDraft(); router.back(); }}
            hitSlop={14}
          >
            <View style={[styles.closeBtn, { backgroundColor: isRecording ? '#ffffff22' : colors.muted }]}>
              <Feather name="x" size={14} color={isRecording ? '#ffffffcc' : colors.mutedForeground} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, step === 1 && { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── TEXT MODE ──────────────────────────────────────────── */}
        {step === 1 && mode === 'text' && (
          <View style={{ flex: 1, paddingHorizontal: 4, paddingTop: 16 }}>
            <Text style={[styles.prompt, { color: colors.foreground, fontSize: 28, lineHeight: 34, letterSpacing: -0.5, marginBottom: 16 }]}>{PROMPT}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity 
                onPress={handleAttachPhoto} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 }}
              >
                <Feather name="camera" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{imageUrl ? 'Change Photo' : 'Attach Photo'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 20, width: '100%' }} />
            
            <Pressable style={{ flex: 1 }} onPress={() => inputRef.current?.focus()}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.foreground, fontSize: 18, lineHeight: 28, flex: 1, minHeight: 200 }]}
                placeholder="Start typing..."
                placeholderTextColor={colors.mutedForeground + '66'}
                multiline
                value={text}
                onChangeText={setText}
                autoFocus
                textAlignVertical="top"
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
              />
            </Pressable>
            
            {imageUrl && (
              <View style={{ marginBottom: 20, position: 'relative', marginTop: 12 }}>
                <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 260, borderRadius: 16 }} resizeMode="cover" />
                <TouchableOpacity 
                  onPress={() => setImageUrl(undefined)}
                  style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 100 }}
                >
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 12 }}>
              {text.length > 0 && (
                <Text style={[styles.charCount, { color: colors.mutedForeground, fontSize: 13, marginBottom: 4 }]}>
                  {text.length} chars
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── VOICE MODE ─────────────────────────────────────────── */}
        {step === 1 && mode === 'voice' && (
          <View style={{ flex: 1, paddingHorizontal: 4, paddingTop: 16, justifyContent: 'space-between' }}>
            
            <View style={{ flex: 1 }}>
              {/* Massive Cinematic Transcript Box */}
              <Pressable style={{ flex: 1 }} onPress={() => inputRef.current?.focus()}>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.input, 
                    { 
                      color: isRecording ? '#ffffff' : colors.foreground, 
                      flex: 1, 
                      minHeight: 200,
                      fontSize: 32, 
                      lineHeight: 40, 
                      fontFamily: 'Inter_300Light' 
                    }
                  ]}
                  placeholder={isRecording ? "I'm listening..." : isProcessing ? "Transcribing..." : "Tap the mic to start..."}
                  placeholderTextColor={isRecording ? '#ffffff88' : (colors.mutedForeground + '66')}
                  multiline
                  value={text}
                  onChangeText={setText}
                  textAlignVertical="top"
                  selectionColor={isRecording ? '#ffffff' : colors.primary}
                  editable={!isRecording && !isProcessing}
                />
              </Pressable>

              {txError ? (
                <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: '#EF4444', marginBottom: 12 }}>{txError}</Text>
              ) : null}
              
              {imageUrl && (
                <View style={{ marginBottom: 20, position: 'relative', marginTop: 12 }}>
                  <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 260, borderRadius: 16 }} resizeMode="cover" />
                  <TouchableOpacity 
                    onPress={() => setImageUrl(undefined)}
                    style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 100 }}
                  >
                    <Feather name="x" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom Controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: isRecording ? '#ffffff22' : colors.border }}>
              {/* Attach Photo (Left) */}
              <TouchableOpacity 
                onPress={handleAttachPhoto} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isRecording ? '#ffffff15' : colors.primary + '15', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100 }}
              >
                <Feather name="camera" size={16} color={isRecording ? '#ffffff' : colors.primary} />
                <Text style={{ color: isRecording ? '#ffffff' : colors.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{imageUrl ? 'Change Photo' : 'Attach Photo'}</Text>
              </TouchableOpacity>

              {/* Mic Button Pill (Right) */}
              <Pressable
                style={[
                  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100 },
                  isRecording
                    ? { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }
                    : { backgroundColor: colors.primary },
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                <Feather
                  name={isProcessing ? 'loader' : isRecording ? 'square' : 'mic'}
                  size={16}
                  color={isRecording ? '#1B4332' : '#ffffff'}
                />
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: isRecording ? '#1B4332' : '#ffffff' }}>
                  {isProcessing ? 'Transcribing...' : isRecording ? `${mm}:${ss}` : 'Start Speaking'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── STEP 2 FORM ────────────────────────────────────────── */}
        {step === 2 && bottomForm}

        {/* Bottom spacer */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Sticky save button ──────────────────────────────────── */}
      <View
        style={[
          styles.saveBar,
          { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: isRecording ? '#1B4332' : colors.background },
        ]}
      >
        <Animated.View style={[{ width: '100%' }, saveBtnStyle]}>
          {step === 1 ? (
            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor: isRecording ? '#ffffff22' : colors.primary,
                },
              ]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setStep(2);
              }}
              disabled={isRecording || isProcessing}
            >
              <Text style={[styles.saveBtnText, { color: isRecording ? '#ffffffcc' : '#fff' }]}>Next Step</Text>
              <Feather name="arrow-right" size={18} color={isRecording ? '#ffffffcc' : '#fff'} />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor:
                    selectedTags.length > 0
                      ? isRecording ? '#fff' : colors.primary
                      : colors.muted,
                },
              ]}
              onPress={handleSave}
              disabled={saving || isRecording || isProcessing}
            >
              {saving ? (
                <Feather name="loader" size={18} color={selectedTags.length > 0 ? (isRecording ? colors.primary : '#fff') : colors.mutedForeground} />
              ) : (
                <Feather name="check" size={18} color={selectedTags.length > 0 ? (isRecording ? colors.primary : '#fff') : colors.mutedForeground} />
              )}
              <Text
                style={[
                  styles.saveBtnText,
                  {
                    color:
                      selectedTags.length > 0
                        ? isRecording ? colors.primary : '#fff'
                        : colors.mutedForeground,
                  },
                ]}
              >
                {saving ? 'Saving…' : (primaryTag ? `Log ${primaryTag.label}` : 'Save Entry')}
              </Text>
              {selectedTags.length > 0 && !saving && (
                <Feather name="arrow-right" size={18} color={isRecording ? colors.primary : '#fff'} />
              )}
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  tabPill: {
    position: 'absolute',
    top: 3, bottom: 3,
    width: 86,
    borderRadius: 100,
  },
  tabBtn: {
    width: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 5,
    zIndex: 1,
  },
  tabLabel: { fontSize: 13 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clock: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  closeBtn: {
    width: 30, height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 18, paddingTop: 6, gap: 14 },

  // ── Form cards ──
  formCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 16,
    gap: 12,
  },
  inputCard: {
    gap: 0,
    borderWidth: 1.5,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formCardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.2,
  },
  requiredPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  requiredText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#D97706',
    letterSpacing: 0.3,
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  doneText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  // ── Input ──
  prompt: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 26,
    letterSpacing: -0.3,
    paddingTop: 2,
  },
  inputDivider: { height: 1, borderRadius: 1, marginVertical: 12 },
  input: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 26,
    minHeight: 80,
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginTop: 6,
    opacity: 0.6,
  },

  taskDropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  taskDropdownText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  taskListContainer: {
    marginTop: 12,
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#0000001a',
    paddingTop: 12,
  },
  taskListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  taskListText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  taskStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Voice ──
  micArea: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    gap: 20,
    position: 'relative',
  },
  rings: {
    position: 'absolute',
    top: 32,
    width: 110, height: 110,
    alignItems: 'center', justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 110, height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  micBtn: {
    width: 100, height: 100,
    borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  micStatusWrap: { alignItems: 'center', gap: 4 },
  micStatus: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  micSubtext: { fontSize: 12, fontFamily: 'Inter_400Regular', letterSpacing: 0.2, textAlign: 'center' },
  tapStop: { fontSize: 11, color: '#ffffff77', fontFamily: 'Inter_400Regular' },
  txHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txHint:  { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  txError: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#EF4444' },

  // ── Save bar ──
  saveBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000011',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.1 },
});
