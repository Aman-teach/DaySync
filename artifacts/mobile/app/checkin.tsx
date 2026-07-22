import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
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
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
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
import * as FileSystem from 'expo-file-system';
import { FocusLevel, EnergyLevel } from '@/types';

// Lazy-import expo-av so it doesn't crash on web
let AudioModule: typeof import('expo-av') | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AudioModule = require('expo-av');
  } catch {}
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'transcribed';

const PROMPT = getRandomPrompt();
const { width: SW, height: SH } = Dimensions.get('screen');
const CIRCLE_SIZE = Math.sqrt(SW * SW + SH * SH) * 2.2;

// ─── Pulse ring ─────────────────────────────────────────────────────────────
function PulseRing({ delay, active }: { delay: number; active: boolean }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1800 }), -1, false)
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(withTiming(0.45, { duration: 200 }), withTiming(0, { duration: 1600 })),
          -1,
          false
        )
      );
    } else {
      scale.value = withTiming(0.3, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View pointerEvents="none" style={[styles.pulseRing, style]} />;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { addEntry, lastFocus, settings } = useApp();

  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [focus, setFocus] = useState<FocusLevel>(lastFocus.focus);
  const [energy, setEnergy] = useState<EnergyLevel>(lastFocus.energy);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [transcribeError, setTranscribeError] = useState('');

  const recordingRef = useRef<InstanceType<typeof import('expo-av').Audio.Recording> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Animation: 0 = idle/normal, 1 = recording/green
  const greenAnim = useSharedValue(0);
  const micScale = useSharedValue(1);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      greenAnim.value,
      [0, 1],
      [colors.background, '#2D6A4F']
    ),
  }));

  const micBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  // ── Timer helpers ────────────────────────────────────────────────────────
  const startTimer = () => {
    setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    elapsedRef.current = null;
  };

  useEffect(() => () => stopTimer(), []);

  // ── Recording ────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Voice recording is not supported in the web preview. Use the Expo Go app on your phone.');
      return;
    }
    if (!AudioModule) return;
    try {
      const { granted } = await AudioModule.Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone access needed', 'Please allow microphone access in Settings.');
        return;
      }
      await AudioModule.Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new AudioModule.Audio.Recording();
      await rec.prepareToRecordAsync(
        AudioModule.Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();
      recordingRef.current = rec;

      setVoiceState('recording');
      setTranscribeError('');
      greenAnim.value = withTiming(1, { duration: 550 });
      micScale.value = withSequence(
        withSpring(1.15, { damping: 6, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 180 })
      );
      startTimer();
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    } catch (e) {
      console.error('Recording start failed', e);
      Alert.alert('Could not start recording', 'Please try again.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    stopTimer();
    const rec = recordingRef.current;
    if (!rec) return;

    setVoiceState('processing');
    greenAnim.value = withTiming(0, { duration: 450 });

    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    try {
      await rec.stopAndUnloadAsync();
      recordingRef.current = null;
      const uri = rec.getURI();
      if (!uri) throw new Error('No URI');

      // Read as base64 and send to transcribe endpoint
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const apiBase = domain
        ? `https://${domain}`
        : 'http://localhost:8080';

      const resp = await fetch(`${apiBase}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: 'audio/m4a' }),
      });

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json() as { transcript?: string; error?: string };

      const result = data.transcript ?? '';
      setTranscript(result);
      setText(result);
      setVoiceState('transcribed');
    } catch (e) {
      console.error('Transcription failed', e);
      setTranscribeError('Transcription failed — type your note below.');
      setVoiceState('transcribed');
    }
  }, []);

  const handleMicPress = () => {
    if (voiceState === 'idle') startRecording();
    else if (voiceState === 'recording') stopRecording();
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selectedTags.length === 0) {
      Alert.alert('Select a tag', 'Choose at least one tag before saving.');
      return;
    }
    const finalText = mode === 'voice' ? text : text;
    setSaving(true);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    await addEntry({
      text: finalText.trim(),
      tags: selectedTags,
      focus,
      energy,
      intervalMinutes: settings.interval,
    });
    router.back();
  };

  // ── UI helpers ───────────────────────────────────────────────────────────
  const toggleTag = (id: string) =>
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  const isRecording = voiceState === 'recording';
  const isProcessing = voiceState === 'processing';

  const micIconName = isRecording ? 'square' : 'mic';
  const micBgColor = isRecording ? '#ffffff22' : '#fff';
  const micIconColor = isRecording ? '#ffffff' : '#2D6A4F';

  const switchMode = (next: 'text' | 'voice') => {
    if (next === mode) return;
    if (isRecording) return; // don't switch while recording
    setMode(next);
    setVoiceState('idle');
  };

  // ── Shared form (tags + focus/energy) ────────────────────────────────────
  const sharedForm = (
    <>
      <View style={styles.fieldGroup}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, { color: isRecording ? '#ffffffaa' : colors.mutedForeground }]}>
            TAG
          </Text>
          {selectedTags.length === 0 && (
            <Text style={[styles.required, { color: isRecording ? '#ffaaaa' : colors.destructive }]}>
              required
            </Text>
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

      <View
        style={[
          styles.pickerCard,
          {
            backgroundColor: isRecording ? '#ffffff15' : colors.card,
            borderColor: isRecording ? '#ffffff30' : colors.border,
          },
        ]}
      >
        <FocusEnergyPicker
          focus={focus}
          energy={energy}
          onFocusChange={setFocus}
          onEnergyChange={setEnergy}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.saveBtn,
          {
            backgroundColor: selectedTags.length > 0
              ? (isRecording ? '#fff' : colors.primary)
              : (isRecording ? '#ffffff33' : colors.muted),
          },
        ]}
        onPress={handleSave}
        disabled={saving || isRecording || isProcessing}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.saveBtnText,
            {
              color: selectedTags.length > 0
                ? (isRecording ? '#2D6A4F' : '#fff')
                : (isRecording ? '#ffffff88' : colors.mutedForeground),
            },
          ]}
        >
          {saving ? 'Saving…' : 'Save Entry'}
        </Text>
      </TouchableOpacity>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[{ flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }, containerStyle]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: isRecording ? '#ffffff55' : colors.border }]} />

        {/* Header row */}
        <View style={styles.headerRow}>
          {/* Mode toggle pills */}
          <View style={[styles.modePills, { backgroundColor: isRecording ? '#ffffff22' : colors.muted }]}>
            <Pressable
              style={[
                styles.modePill,
                mode === 'text' && !isRecording && {
                  backgroundColor: colors.card,
                },
                mode === 'text' && isRecording && {
                  backgroundColor: '#ffffff25',
                },
              ]}
              onPress={() => switchMode('text')}
            >
              <Feather
                name="edit-2"
                size={13}
                color={
                  mode === 'text'
                    ? isRecording ? '#fff' : colors.foreground
                    : isRecording ? '#ffffff88' : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.modePillLabel,
                  {
                    color:
                      mode === 'text'
                        ? isRecording ? '#fff' : colors.foreground
                        : isRecording ? '#ffffff88' : colors.mutedForeground,
                    fontFamily:
                      mode === 'text' ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                Text
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modePill,
                mode === 'voice' && !isRecording && {
                  backgroundColor: colors.card,
                },
                mode === 'voice' && isRecording && {
                  backgroundColor: '#ffffff25',
                },
              ]}
              onPress={() => switchMode('voice')}
            >
              <Feather
                name="mic"
                size={13}
                color={
                  mode === 'voice'
                    ? isRecording ? '#fff' : colors.foreground
                    : isRecording ? '#ffffff88' : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.modePillLabel,
                  {
                    color:
                      mode === 'voice'
                        ? isRecording ? '#fff' : colors.foreground
                        : isRecording ? '#ffffff88' : colors.mutedForeground,
                    fontFamily:
                      mode === 'voice' ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                Voice
              </Text>
            </Pressable>
          </View>

          {/* Time + close */}
          <View style={styles.headerRight}>
            <Text style={[styles.timeStr, { color: isRecording ? '#ffffffaa' : colors.mutedForeground }]}>
              {timeStr}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (isRecording) stopRecording();
                router.back();
              }}
              hitSlop={12}
            >
              <Feather name="x" size={22} color={isRecording ? '#ffffffcc' : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom + 20, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── TEXT MODE ─────────────────────────────────────────── */}
          {mode === 'text' && (
            <>
              <Text style={[styles.prompt, { color: colors.foreground }]}>{PROMPT}</Text>

              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={[
                  styles.inputWrap,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
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

              {sharedForm}
            </>
          )}

          {/* ── VOICE MODE ────────────────────────────────────────── */}
          {mode === 'voice' && (
            <>
              {/* Mic button + pulse rings */}
              <View style={styles.micArea}>
                {/* Pulse rings (behind button) */}
                <View style={styles.pulseContainer}>
                  <PulseRing delay={0} active={isRecording} />
                  <PulseRing delay={500} active={isRecording} />
                  <PulseRing delay={1000} active={isRecording} />
                </View>

                {/* Central mic button */}
                <Animated.View style={micBtnStyle}>
                  <TouchableOpacity
                    style={[
                      styles.micBtn,
                      {
                        backgroundColor: isRecording ? '#ffffff22' : colors.primary,
                        borderColor: isRecording ? '#ffffffcc' : 'transparent',
                        borderWidth: isRecording ? 2 : 0,
                      },
                    ]}
                    onPress={handleMicPress}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={isProcessing ? 'loader' : micIconName}
                      size={38}
                      color={isRecording ? '#fff' : '#fff'}
                    />
                  </TouchableOpacity>
                </Animated.View>

                {/* Timer / status label */}
                <Text
                  style={[
                    styles.micLabel,
                    {
                      color: isRecording
                        ? '#ffffffee'
                        : isProcessing
                        ? colors.mutedForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {isRecording
                    ? `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`
                    : isProcessing
                    ? 'Transcribing…'
                    : voiceState === 'transcribed'
                    ? 'Tap mic to re-record'
                    : Platform.OS === 'web'
                    ? 'Voice needs Expo Go on phone'
                    : 'Tap to speak'}
                </Text>

                {isRecording && (
                  <Text style={styles.tapToStop}>tap to stop</Text>
                )}
              </View>

              {/* Transcript / editable text (shown after transcription) */}
              {(voiceState === 'transcribed') && (
                <>
                  {transcribeError ? (
                    <Text style={[styles.errorMsg, { color: isRecording ? '#ffaaaa' : colors.destructive }]}>
                      {transcribeError}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => inputRef.current?.focus()}
                    style={[
                      styles.inputWrap,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      ref={inputRef}
                      style={[styles.input, { color: colors.foreground }]}
                      placeholder="Your transcript will appear here…"
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                      value={text}
                      onChangeText={setText}
                      textAlignVertical="top"
                    />
                  </Pressable>
                </>
              )}

              {sharedForm}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  modePills: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 3,
    gap: 2,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  modePillLabel: { fontSize: 13 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeStr: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 18 },
  prompt: { fontSize: 20, fontFamily: 'Inter_700Bold', lineHeight: 28 },
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
  // Voice
  micArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 12,
    gap: 18,
    position: 'relative',
  },
  pulseContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  tapToStop: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#ffffff88',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  errorMsg: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  // Shared form
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
    marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
