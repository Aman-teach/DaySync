/**
 * Check-in modal — Text + Voice tabs, sticky save, spring animations.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { TAGS } from '@/constants/tags';
import { getRandomPrompt } from '@/constants/prompts';
import { FocusEnergyPicker } from '@/components/FocusEnergyPicker';
import { TagChip } from '@/components/TagChip';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { FocusLevel, EnergyLevel } from '@/types';

let AudioModule: typeof import('expo-av') | null = null;
if (Platform.OS !== 'web') {
  try { AudioModule = require('expo-av'); } catch {}
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'transcribed';
type Mode = 'text' | 'voice';

const PROMPT = getRandomPrompt();
const { width: SW, height: SH } = Dimensions.get('screen');

// ─── Pulse ring ──────────────────────────────────────────────────────────────
function PulseRing({ delay, active }: { delay: number; active: boolean }) {
  const scale   = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value   = withDelay(delay, withRepeat(withTiming(1, { duration: 1700 }), -1, false));
      opacity.value = withDelay(delay, withRepeat(
        withSequence(withTiming(0.5, { duration: 150 }), withTiming(0, { duration: 1550 })),
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

// ─── Animated tab switcher ───────────────────────────────────────────────────
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
      {/* Sliding pill */}
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
  const { addEntry, lastFocus, settings } = useApp();

  const [mode,        setMode]        = useState<Mode>('text');
  const [voiceState,  setVoiceState]  = useState<VoiceState>('idle');
  const [text,        setText]        = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [focus,  setFocus]  = useState<FocusLevel>(lastFocus.focus);
  const [energy, setEnergy] = useState<EnergyLevel>(lastFocus.energy);
  const [saving,    setSaving]    = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [txError,   setTxError]   = useState('');

  const recordingRef  = useRef<InstanceType<typeof import('expo-av').Audio.Recording> | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef      = useRef<TextInput>(null);

  // Animations
  const greenAnim  = useSharedValue(0);
  const micScale   = useSharedValue(1);
  const saveScale  = useSharedValue(1);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      greenAnim.value, [0, 1], [colors.background, '#1B4332']
    ),
  }));

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Voice needs Expo Go', 'Open this app on your phone with Expo Go to use voice logging.');
      return;
    }
    if (!AudioModule) return;
    const { granted } = await AudioModule.Audio.requestPermissionsAsync();
    if (!granted) { Alert.alert('Mic needed', 'Allow microphone in Settings to use voice.'); return; }

    await AudioModule.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new AudioModule.Audio.Recording();
    await rec.prepareToRecordAsync(AudioModule.Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    recordingRef.current = rec;

    setVoiceState('recording');
    setTxError('');
    setElapsed(0);
    greenAnim.value = withTiming(1, { duration: 500 });
    micScale.value  = withSequence(
      withSpring(1.18, { damping: 6, stiffness: 220 }),
      withSpring(1,    { damping: 9, stiffness: 200 })
    );
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const rec = recordingRef.current;
    if (!rec) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    setVoiceState('processing');
    greenAnim.value = withTiming(0, { duration: 420 });

    try {
      await rec.stopAndUnloadAsync();
      recordingRef.current = null;
      const uri = rec.getURI();
      if (!uri) throw new Error('No URI');

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const domain  = process.env.EXPO_PUBLIC_DOMAIN;
      const apiBase = domain ? `https://${domain}` : 'http://localhost:8080';

      const resp = await fetch(`${apiBase}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: 'audio/m4a' }),
      });
      const data = await resp.json() as { transcript?: string; error?: string };
      setText(data.transcript ?? '');
      setVoiceState('transcribed');
      if (data.transcript) { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} }
    } catch {
      setTxError('Could not transcribe — type your note below.');
      setVoiceState('transcribed');
    }
  }, []);

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
    await addEntry({ text: text.trim(), tags: selectedTags, focus, energy, intervalMinutes: settings.interval });
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

  const isRecording  = voiceState === 'recording';
  const isProcessing = voiceState === 'processing';

  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const mm      = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss      = String(elapsed % 60).padStart(2, '0');

  const saveBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));
  const micBtnStyle  = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value  }] }));

  // ── Shared bottom form ─────────────────────────────────────────────────────
  const bottomForm = (
    <>
      {/* Tags */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: isRecording ? '#ffffff99' : colors.mutedForeground }]}>
            ACTIVITY
          </Text>
          {selectedTags.length === 0 && (
            <Text style={[styles.requiredBadge, { color: isRecording ? '#ffaaaa' : '#D97706' }]}>
              pick one
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

      {/* Focus + energy */}
      <View style={styles.section}>
        <FocusEnergyPicker
          focus={focus}
          energy={energy}
          onFocusChange={setFocus}
          onEnergyChange={setEnergy}
        />
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
        <ModeTabs mode={mode} onSwitch={switchMode} disabled={isRecording} isRecording={isRecording} />
        <View style={styles.topRight}>
          <Text style={[styles.clock, { color: isRecording ? '#ffffffaa' : colors.mutedForeground }]}>
            {timeStr}
          </Text>
          <Pressable
            onPress={() => { if (isRecording) stopRecording(); router.back(); }}
            hitSlop={14}
          >
            <Feather name="x" size={20} color={isRecording ? '#ffffffcc' : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── TEXT MODE ──────────────────────────────────────────── */}
        {mode === 'text' && (
          <>
            <Text style={[styles.prompt, { color: colors.foreground }]}>{PROMPT}</Text>

            <Pressable onPress={() => inputRef.current?.focus()} style={styles.inputArea}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder="What were you doing?"
                placeholderTextColor={colors.mutedForeground + '88'}
                multiline
                value={text}
                onChangeText={setText}
                autoFocus
                textAlignVertical="top"
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
              />
              {/* Subtle bottom rule instead of a box */}
              <View style={[styles.inputRule, { backgroundColor: colors.border }]} />
            </Pressable>

            {bottomForm}
          </>
        )}

        {/* ── VOICE MODE ─────────────────────────────────────────── */}
        {mode === 'voice' && (
          <>
            {/* Mic area */}
            <View style={styles.micArea}>
              {/* Pulse rings */}
              <View style={styles.rings} pointerEvents="none">
                <PulseRing delay={0}    active={isRecording} />
                <PulseRing delay={540}  active={isRecording} />
                <PulseRing delay={1080} active={isRecording} />
              </View>

              {/* Mic button */}
              <Animated.View style={micBtnStyle}>
                <Pressable
                  style={[
                    styles.micBtn,
                    isRecording
                      ? { backgroundColor: '#ffffff22', borderWidth: 2, borderColor: '#ffffffcc' }
                      : { backgroundColor: colors.primary },
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  <Feather
                    name={isProcessing ? 'loader' : isRecording ? 'square' : 'mic'}
                    size={40}
                    color="#fff"
                  />
                </Pressable>
              </Animated.View>

              {/* Status text */}
              <Text style={[styles.micStatus, { color: isRecording ? '#ffffffee' : colors.mutedForeground }]}>
                {isRecording
                  ? `${mm}:${ss}`
                  : isProcessing
                  ? 'Transcribing…'
                  : voiceState === 'transcribed'
                  ? 'Tap to re-record'
                  : Platform.OS === 'web'
                  ? 'Use Expo Go on your phone'
                  : 'Tap to speak'}
              </Text>

              {isRecording && (
                <Text style={styles.tapStop}>tap square to stop</Text>
              )}
            </View>

            {/* Transcript box */}
            {voiceState === 'transcribed' && (
              <View style={styles.transcriptWrap}>
                {txError ? (
                  <Text style={[styles.txError, { color: colors.destructive }]}>{txError}</Text>
                ) : (
                  <Text style={[styles.txHint, { color: colors.mutedForeground }]}>
                    ✦ Edit if needed
                  </Text>
                )}
                <Pressable onPress={() => inputRef.current?.focus()} style={[styles.inputArea, { marginTop: 6 }]}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Your words will appear here…"
                    placeholderTextColor={colors.mutedForeground + '88'}
                    multiline
                    value={text}
                    onChangeText={setText}
                    textAlignVertical="top"
                    selectionColor={colors.primary}
                  />
                </Pressable>
              </View>
            )}

            {bottomForm}
          </>
        )}

        {/* Bottom spacer so content doesn't hide behind sticky btn */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Sticky save button ──────────────────────────────────── */}
      <View
        style={[
          styles.saveBar,
          { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: isRecording ? '#1B4332' : colors.background },
        ]}
      >
        <Animated.View style={[{ flex: 1 }, saveBtnStyle]}>
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
              {saving ? 'Saving…' : 'Save Entry'}
            </Text>
            {selectedTags.length > 0 && !saving && (
              <Feather name="arrow-right" size={18} color={isRecording ? colors.primary : '#fff'} />
            )}
          </Pressable>
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
    alignSelf: 'center', marginTop: 10, marginBottom: 0,
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
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clock: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  scroll: { paddingHorizontal: 22, paddingTop: 4, gap: 22 },
  prompt: { fontSize: 22, fontFamily: 'Inter_700Bold', lineHeight: 30, letterSpacing: -0.3 },
  inputArea: { minHeight: 110, justifyContent: 'flex-start' },
  input: {
    fontSize: 17,
    fontFamily: 'Inter_400Regular',
    lineHeight: 26,
    minHeight: 90,
    // Remove web default border
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  inputRule: { height: 1.5, borderRadius: 1, marginTop: 6 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  requiredBadge: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  // Voice
  micArea: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
    gap: 16,
    position: 'relative',
  },
  rings: {
    position: 'absolute',
    top: 28,
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
  micStatus: { fontSize: 15, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2, marginTop: 4 },
  tapStop: { fontSize: 11, color: '#ffffff77', fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  transcriptWrap: { gap: 0 },
  txHint:  { fontSize: 12, fontFamily: 'Inter_500Medium' },
  txError: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  // Save bar
  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000011',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: 100,
    gap: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.1 },
});
