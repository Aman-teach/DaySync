/**
 * Check-in modal — completely redesigned premium UI
 */
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Audio } from 'expo-av';
import {
  Alert,
  Dimensions,
  Keyboard,
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
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  LinearTransition,
  FadeIn,
  FadeOut,
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { FocusLevel, EnergyLevel, Domain, Activity } from '@/types';
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
  const { addEntry, updateEntry, lastFocus, settings, tasks, entries, domains, activities } = useApp();

  const { mode: initialMode, autoStart } = useLocalSearchParams<{ mode: Mode; autoStart?: string }>();
  const [mode,        setMode]        = useState<Mode>(initialMode ?? 'text');
  const [step,        setStep]        = useState<1 | 2>(1);
  const [voiceState,  setVoiceState]  = useState<VoiceState>('idle');
  const [text,        setText]        = useState('');
  
  // Progressive Disclosure State
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [focus,  setFocus]  = useState<FocusLevel | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  
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
  const isSavingRef   = useRef(false);

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
      if (draft.domainId)      setSelectedDomainId(draft.domainId);
      if (draft.activityId)    setSelectedActivityId(draft.activityId);
      if (draft.focus)         setFocus(draft.focus as FocusLevel);
      if (draft.energy)        setEnergy(draft.energy as EnergyLevel);
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
  const tagShakeAnim = useSharedValue(0);

  // ── Auto-save draft whenever any field changes (debounced 500ms) ──────────
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      // Persist all imageUrls (they are copied to documentDirectory upon capture)
      saveCheckinDraft({ text, domainId: selectedDomainId || undefined, activityId: selectedActivityId || undefined, focus: focus || '', energy: energy || '', customDuration: customDuration || undefined, taskId, taskTitle, imageUrl });
    }, 500);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [text, selectedDomainId, selectedActivityId, focus, energy, customDuration, taskId, taskTitle, imageUrl]);

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

      // Start recording with high compatibility options (MONO channel to prevent hardware encoder failure on some Androids)
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1, // Strict MONO for Android compatibility
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      
      recordingRef.current = recording;
      setVoiceState('recording');
      setTxError('');
      setElapsed(0);
      greenAnim.value = withTiming(1, { duration: 500 });
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    } catch (e: any) {
      console.log('Failed to start recording', e);
      setTxError(e.message || 'Failed to start recording');
      recordingRef.current = null;
    }
  }, [greenAnim]);

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
          // Read audio file as base64 string cross-platform
          let base64Audio = '';
          if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            base64Audio = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.split(',')[1] || '');
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } else {
            base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            });
          }

          // Send base64 audio directly to the Transcribe function (bypassing the storage bucket)
          const execution = await functions.createExecution(
            APPWRITE_CONFIG.FUNCTIONS.TRANSCRIBE,
            JSON.stringify({ audio: base64Audio, mimeType: 'audio/m4a' }),
            false,
            '/v1/executions',
            ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
          );

          if (execution.status === 'completed') {
            const res = JSON.parse(execution.responseBody);
            if (res.error) {
              setTxError(`Transcription failed: ${res.error}`);
            } else {
              setText(prev => (prev ? prev + ' ' + res.transcript : res.transcript));
              try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            }
          } else {
            setTxError('Transcription failed.');
          }
        }
      }
      setVoiceState('transcribed');
    } catch (e: any) {
      console.log('Failed to stop recording', e);
      setTxError(e.message || 'Could not stop recording');
      setVoiceState('transcribed');
      if (recordingRef.current) {
        recordingRef.current = null;
      }
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
    if (isSavingRef.current) return;
    
    if (!selectedDomainId || !selectedActivityId || !focus || !energy || !customDuration) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      return;
    }
    
    isSavingRef.current = true;
    saveScale.value = withSequence(
      withSpring(0.94, { damping: 8, stiffness: 300 }),
      withSpring(1,    { damping: 9, stiffness: 250 })
    );
    setSaving(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    try {
      const newEntryId = await addEntry({ 
        text: text.trim(), 
        domainId: selectedDomainId,
        activityId: selectedActivityId,
        focus, 
        energy,
        duration: customDuration,
        intervalMinutes: customDuration,
        taskId,
        taskTitle,
        imageUrl: imageUrl,
      });
      
      await clearCheckinDraft();
      router.back();

      // Fire and forget background upload for images
      if (imageUrl && !imageUrl.startsWith('http')) {
        uploadImageToAppwrite(imageUrl).then(uploadedUrl => {
          if (uploadedUrl) {
            updateEntry(newEntryId, { imageUrl: uploadedUrl });
          }
        }).catch(err => {
          console.log('Background image upload failed', err);
        });
      }
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
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
        const tempUri = result.assets[0].uri;
        let persistentUri = tempUri;
        try {
          if (Platform.OS !== 'web') {
            const fileName = tempUri.split('/').pop() || `draft-${Date.now()}.jpg`;
            const newPath = FileSystem.documentDirectory + fileName;
            await FileSystem.copyAsync({ from: tempUri, to: newPath });
            persistentUri = newPath;
          }
        } catch (e) {
          console.log('Failed to copy to persistent storage', e);
        }
        
        setImageUrl(persistentUri);
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
  const tagGridStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tagShakeAnim.value }] }));

  const greetingTitle = useMemo(() => {
    const titles = ["Hello, Aman.", "Welcome back.", "Ready to focus?", "Let's log it.", "Hey, Aman."];
    return titles[Math.floor(Math.random() * titles.length)];
  }, []);
  
  const greetingSubtitle = useMemo(() => {
    const subtitles = ["Let's log your session.", "What did you accomplish?", "Time to capture your progress.", "Record your momentum.", "Every session counts."];
    return subtitles[Math.floor(Math.random() * subtitles.length)];
  }, []);

  // ── Shared bottom form ─────────────────────────────────────────────────────
  const bottomForm = (
    <View style={{ gap: 20, paddingHorizontal: 4 }}>
      {/* Personalized Greeting */}
      <View style={{ marginBottom: 16, marginTop: 4 }}>
        <Text style={{ fontSize: 28, fontFamily: 'Inter_400Regular', color: isRecording ? '#ffffff' : colors.foreground, letterSpacing: -0.5 }}>
          {greetingTitle}
        </Text>
        <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: isRecording ? '#ffffffaa' : colors.mutedForeground, marginTop: 4 }}>
          {greetingSubtitle}
        </Text>
      </View>

      {/* 1. Domain */}
      <Animated.View style={[styles.premiumCard, { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }]}>
        {selectedDomainId ? (
          <TouchableOpacity 
            onPress={() => {
              setSelectedDomainId(null);
              setSelectedActivityId(null);
              setFocus(null);
              setEnergy(null);
              setCustomDuration(null);
              try { Haptics.selectionAsync(); } catch {}
            }}
            style={styles.premiumCardHeaderCollapsed}
            activeOpacity={0.7}
          >
            <Text style={[styles.premiumCardTitleCollapsed, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Area</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.premiumCardValue, { color: isRecording ? '#fff' : colors.primary }]}>{domains.find(d => d.id === selectedDomainId)?.name}</Text>
              <Feather name="chevron-down" size={16} color={isRecording ? '#ffffff66' : colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ padding: 16 }}>
            <Text style={[styles.premiumCardTitleActive, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Select Area</Text>
            <View style={styles.premiumGrid}>
              {[...domains].sort((a,b) => a.position - b.position).map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.premiumTile, { backgroundColor: isRecording ? '#ffffff11' : (d.color || colors.primary) + '11', borderColor: isRecording ? '#ffffff22' : (d.color || colors.primary) + '22' }]}
                  onPress={() => { setSelectedDomainId(d.id); try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }}
                >
                  <View style={[styles.premiumTileIconWrap, { backgroundColor: isRecording ? '#ffffff22' : (d.color || colors.primary) + '22' }]}>
                    <Feather name={d.icon as any} size={18} color={isRecording ? '#fff' : (d.color || colors.primary)} />
                  </View>
                  <Text style={[styles.premiumTileText, { color: isRecording ? '#fff' : colors.foreground }]}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {/* 2. Activity */}
      {selectedDomainId && (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.premiumCard, { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }]}>
          {selectedActivityId ? (
            <TouchableOpacity 
              onPress={() => {
                setSelectedActivityId(null);
                setFocus(null);
                setEnergy(null);
                setCustomDuration(null);
                try { Haptics.selectionAsync(); } catch {}
              }}
              style={styles.premiumCardHeaderCollapsed}
              activeOpacity={0.7}
            >
              <Text style={[styles.premiumCardTitleCollapsed, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Activity</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.premiumCardValue, { color: isRecording ? '#fff' : colors.primary }]}>{activities.find(a => a.id === selectedActivityId)?.name}</Text>
                <Feather name="chevron-down" size={16} color={isRecording ? '#ffffff66' : colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ) : (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ padding: 16 }}>
              <Text style={[styles.premiumCardTitleActive, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Select Activity</Text>
              <View style={styles.premiumGrid}>
                {[...activities].filter(a => a.domainId === selectedDomainId).sort((a,b) => a.position - b.position).map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.premiumTile, { backgroundColor: isRecording ? '#ffffff11' : colors.background, borderColor: isRecording ? '#ffffff22' : colors.border }]}
                    onPress={() => { setSelectedActivityId(a.id); try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }}
                  >
                    {a.icon && (
                      <View style={[styles.premiumTileIconWrap, { backgroundColor: isRecording ? '#ffffff22' : colors.card, width: 28, height: 28 }]}>
                        <Feather name={a.icon as any} size={14} color={isRecording ? '#fff' : colors.foreground} />
                      </View>
                    )}
                    <Text style={[styles.premiumTileText, { color: isRecording ? '#fff' : colors.foreground, marginLeft: a.icon ? 0 : 4 }]}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* 3. Focus */}
      {selectedActivityId && (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.premiumCard, { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }]}>
          {focus ? (
             <TouchableOpacity 
              onPress={() => {
                setFocus(null);
                setEnergy(null);
                setCustomDuration(null);
                try { Haptics.selectionAsync(); } catch {}
              }}
              style={styles.premiumCardHeaderCollapsed}
              activeOpacity={0.7}
            >
              <Text style={[styles.premiumCardTitleCollapsed, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Focus</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.premiumCardValue, { color: isRecording ? '#fff' : colors.primary, textTransform: 'capitalize' }]}>{focus}</Text>
                <Feather name="chevron-down" size={16} color={isRecording ? '#ffffff66' : colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ) : (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ padding: 16 }}>
              <Text style={[styles.premiumCardTitleActive, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Focus Level</Text>
              <View style={styles.premiumGridRow}>
                {['deep', 'normal', 'distracted', 'neutral'].map(f => {
                  const iconName = f === 'deep' ? 'target' : f === 'normal' ? 'check-circle' : f === 'distracted' ? 'wind' : 'minus';
                  return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.premiumPill, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isRecording ? '#ffffff11' : colors.background, borderColor: isRecording ? '#ffffff22' : colors.border }]}
                    onPress={() => { setFocus(f as any); try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }}
                  >
                    <Feather name={iconName as any} size={14} color={isRecording ? '#ffffffcc' : colors.mutedForeground} />
                    <Text style={[styles.premiumPillText, { color: isRecording ? '#fff' : colors.foreground, textTransform: 'capitalize' }]}>{f}</Text>
                  </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* 4. Energy */}
      {focus && (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.premiumCard, { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }]}>
          {energy ? (
             <TouchableOpacity 
              onPress={() => {
                setEnergy(null);
                setCustomDuration(null);
                try { Haptics.selectionAsync(); } catch {}
              }}
              style={styles.premiumCardHeaderCollapsed}
              activeOpacity={0.7}
            >
              <Text style={[styles.premiumCardTitleCollapsed, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Energy</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.premiumCardValue, { color: isRecording ? '#fff' : colors.primary, textTransform: 'capitalize' }]}>{energy}</Text>
                <Feather name="chevron-down" size={16} color={isRecording ? '#ffffff66' : colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ) : (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ padding: 16 }}>
              <Text style={[styles.premiumCardTitleActive, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Energy Level</Text>
              <View style={styles.premiumGridRow}>
                {['high', 'medium', 'low'].map(e => {
                  const iconName = e === 'high' ? 'zap' : e === 'medium' ? 'activity' : 'battery';
                  return (
                  <TouchableOpacity
                    key={e}
                    style={[styles.premiumPill, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isRecording ? '#ffffff11' : colors.background, borderColor: isRecording ? '#ffffff22' : colors.border }]}
                    onPress={() => { setEnergy(e as any); try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }}
                  >
                    <Feather name={iconName as any} size={14} color={isRecording ? '#ffffffcc' : colors.mutedForeground} />
                    <Text style={[styles.premiumPillText, { color: isRecording ? '#fff' : colors.foreground, textTransform: 'capitalize' }]}>{e}</Text>
                  </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* 5. Duration */}
      {energy && (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.premiumCard, { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }]}>
          {customDuration ? (
             <TouchableOpacity 
              onPress={() => {
                setCustomDuration(null);
                try { Haptics.selectionAsync(); } catch {}
              }}
              style={styles.premiumCardHeaderCollapsed}
              activeOpacity={0.7}
            >
              <Text style={[styles.premiumCardTitleCollapsed, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Duration</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.premiumCardValue, { color: isRecording ? '#fff' : colors.primary }]}>{customDuration >= 60 ? (customDuration % 60 === 0 ? `${customDuration / 60}h` : `${Math.floor(customDuration / 60)}h ${customDuration % 60}m`) : `${customDuration}m`}</Text>
                <Feather name="chevron-down" size={16} color={isRecording ? '#ffffff66' : colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ) : (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ padding: 16 }}>
              <Text style={[styles.premiumCardTitleActive, { color: isRecording ? '#ffffffcc' : colors.foreground }]}>Session Length</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[15, 30, 45, 60, 90, 120, 180, 240].map(dur => (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.premiumPill, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isRecording ? '#ffffff11' : colors.background, borderColor: isRecording ? '#ffffff22' : colors.border }]}
                    onPress={() => { setCustomDuration(dur); try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }}
                  >
                    <Feather name="clock" size={14} color={isRecording ? '#ffffffcc' : colors.mutedForeground} />
                    <Text style={[styles.premiumPillText, { color: isRecording ? '#fff' : colors.foreground }]}>
                      {dur >= 60 ? (dur % 60 === 0 ? `${dur / 60}h` : `${Math.floor(dur / 60)}h ${dur % 60}m`) : `${dur}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* 6. Link Task */}
      {customDuration && tasks.length > 0 && (
          <Animated.View entering={FadeIn.duration(250)} style={[styles.premiumCard, { backgroundColor: isRecording ? '#ffffff11' : colors.card, borderColor: isRecording ? '#ffffff22' : colors.border }]}>
            <TouchableOpacity
              style={styles.premiumCardHeaderCollapsed}
              onPress={() => setShowTaskList(!showTaskList)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.premiumTileIconWrap, { width: 28, height: 28, borderRadius: 6, backgroundColor: taskId ? (isRecording ? '#ffffff22' : colors.primary + '22') : (isRecording ? '#ffffff11' : colors.muted) }]}>
                  <Feather
                    name={taskId ? 'link-2' : 'link'}
                    size={14}
                    color={taskId ? (isRecording ? '#fff' : colors.primary) : (isRecording ? '#ffffffcc' : colors.mutedForeground)}
                  />
                </View>
                <Text
                  style={[styles.premiumCardTitleCollapsed, { color: taskId ? (isRecording ? '#fff' : colors.primary) : (isRecording ? '#ffffffcc' : colors.foreground), flex: 1 }]}
                  numberOfLines={1}
                >
                  {taskId ? taskTitle : 'Link AtlasOS Task'}
                </Text>
              </View>
              <Feather
                name={showTaskList ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={isRecording ? '#ffffffcc' : colors.mutedForeground}
              />
            </TouchableOpacity>

            {showTaskList && (
              <Animated.View entering={FadeIn.duration(200)} style={[styles.taskListContainer, { borderTopColor: isRecording ? '#ffffff33' : colors.border }]}>
                {taskId && (
                  <TouchableOpacity
                    style={[styles.taskListItem, { backgroundColor: isRecording ? '#ffffff11' : 'transparent' }]}
                    onPress={() => {
                      setTaskId(undefined);
                      setTaskTitle(undefined);
                      setShowTaskList(false);
                      try { Haptics.selectionAsync(); } catch {}
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
                          backgroundColor: isSelected ? (isRecording ? '#ffffff22' : colors.primary + '15') : 'transparent',
                        }
                      ]}
                      onPress={() => {
                        setTaskId(task.id);
                        setTaskTitle(task.title);
                        setShowTaskList(false);
                        try { Haptics.selectionAsync(); } catch {}
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
              </Animated.View>
            )}
          </Animated.View>
      )}
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      {step === 1 ? (
        <Animated.View 
          entering={FadeIn.duration(300).springify().damping(15)}
          style={[
            styles.floatingSaveContainer,
            { paddingBottom: Math.max(insets.bottom, 24) }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.premiumSaveBtn,
              {
                backgroundColor: isRecording ? '#ffffff22' : colors.primary,
                shadowColor: isRecording ? '#ffffff' : colors.primary,
              },
            ]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setStep(2);
            }}
            disabled={isRecording || isProcessing}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.premiumSaveBtnText,
                { color: isRecording ? '#ffffffcc' : '#fff' },
              ]}
            >
              Next Step
            </Text>
            <Feather name="arrow-right" size={20} color={isRecording ? '#ffffffcc' : '#fff'} />
          </TouchableOpacity>
        </Animated.View>
      ) : step === 2 && (selectedDomainId && selectedActivityId && focus && energy && customDuration) ? (
        <Animated.View 
          entering={FadeIn.duration(300).springify().damping(15)}
          style={[
            styles.floatingSaveContainer,
            { paddingBottom: Math.max(insets.bottom, 24) }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.premiumSaveBtn,
              {
                backgroundColor: isRecording ? '#ffffff' : colors.primary,
                shadowColor: isRecording ? '#ffffff' : colors.primary,
              },
            ]}
            onPress={handleSave}
            disabled={saving || isRecording || isProcessing}
            activeOpacity={0.8}
          >
            {saving ? (
              <Feather name="loader" size={20} color={isRecording ? '#1B4332' : '#fff'} />
            ) : (
              <Feather name="check" size={20} color={isRecording ? '#1B4332' : '#fff'} />
            )}
            <Text
              style={[
                styles.premiumSaveBtnText,
                { color: isRecording ? '#1B4332' : '#fff' },
              ]}
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
      </KeyboardAvoidingView>
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
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#00000015',
    paddingTop: 16,
    paddingBottom: 4,
  },
  taskListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  taskListText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    letterSpacing: -0.2,
    flex: 1,
  },
  premiumCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  premiumCardHeaderCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  premiumCardTitleCollapsed: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  premiumCardValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  premiumCardTitleActive: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  premiumGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  premiumTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    flexGrow: 1,
  },
  premiumTileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTileText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  premiumPill: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPillText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  floatingSaveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  premiumSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: '100%',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumSaveBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EF444433',
  },
});