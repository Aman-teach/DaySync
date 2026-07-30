import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { exportToCSV } from '@/utils/export';
import { requestNotificationPermission } from '@/utils/notifications';
import { formatHour } from '@/utils/helpers';
import { Settings } from '@/types';
import { ExportModal } from '@/components/ExportModal';
import { TagManagerModal } from '@/components/TagManagerModal';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

const INTERVALS: Array<Settings['interval']> = [15, 30, 60, 90];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionBody, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  label,
  rightEl,
  onPress,
  isLast,
}: {
  label: string;
  rightEl: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.settingRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      {rightEl}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { settings, updateSettings, entries, generateDayWrap } = useApp();
  const { logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        return;
      }
    }
    await updateSettings({ notificationsEnabled: val });
  };

  const handleExport = () => {
    if (entries.length === 0) {
      Alert.alert('No data', 'Log some entries first before exporting.');
      return;
    }
    setShowExportModal(true);
  };

  const handleGenerateWrap = async () => {
    if (entries.length === 0) {
      Alert.alert('No entries', 'Log some entries today first.');
      return;
    }
    setGenerating(true);
    const result = await generateDayWrap();
    setGenerating(false);
    if (!result) {
      Alert.alert('AI unavailable', 'Could not reach the AI service. Check your connection and try again.');
    } else {
      Alert.alert('Day Wrap ready', 'Your AI summary has been generated. Check the Today tab to see it.');
    }
  };

  const handleActiveHourChange = (which: 'start' | 'end', delta: number) => {
    if (which === 'start') {
      const next = Math.min(settings.activeEnd - 1, Math.max(0, settings.activeStart + delta));
      updateSettings({ activeStart: next });
    } else {
      const next = Math.min(23, Math.max(settings.activeStart + 1, settings.activeEnd + delta));
      updateSettings({ activeEnd: next });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.navHeader, { paddingTop: topPad, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: 12,
            paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>DaySync</Text>
        </View>

        {/* Reminder interval */}
        <Section title="REMINDER INTERVAL">
          <SettingRow
            label="Check-in every"
            isLast
            rightEl={
              <View style={styles.segControl}>
                {INTERVALS.map(iv => (
                  <TouchableOpacity
                    key={iv}
                    style={[
                      styles.seg,
                      settings.interval === iv && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => updateSettings({ interval: iv })}
                  >
                    <Text
                      style={[
                        styles.segText,
                        { color: settings.interval === iv ? '#fff' : colors.mutedForeground },
                      ]}
                    >
                      {iv}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        </Section>

        {/* Active hours */}
        <Section title="ACTIVE HOURS">
          <SettingRow
            label="Reminders start"
            rightEl={
              <View style={styles.hourPicker}>
                <TouchableOpacity onPress={() => handleActiveHourChange('start', -1)}>
                  <Feather name="minus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.hourText, { color: colors.foreground }]}>
                  {formatHour(settings.activeStart)}
                </Text>
                <TouchableOpacity onPress={() => handleActiveHourChange('start', 1)}>
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            }
          />
          <SettingRow
            label="Reminders end"
            rightEl={
              <View style={styles.hourPicker}>
                <TouchableOpacity onPress={() => handleActiveHourChange('end', -1)}>
                  <Feather name="minus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.hourText, { color: colors.foreground }]}>
                  {formatHour(settings.activeEnd)}
                </Text>
                <TouchableOpacity onPress={() => handleActiveHourChange('end', 1)}>
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            }
          />
          <SettingRow
            label="Day starts at"
            isLast
            rightEl={
              <View style={styles.hourPicker}>
                <TouchableOpacity
                  onPress={() =>
                    updateSettings({ dayStartHour: Math.max(0, settings.dayStartHour - 1) })
                  }
                >
                  <Feather name="minus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.hourText, { color: colors.foreground }]}>
                  {formatHour(settings.dayStartHour)}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    updateSettings({ dayStartHour: Math.min(10, settings.dayStartHour + 1) })
                  }
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            }
          />
        </Section>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <SettingRow
            label="Reminder notifications"
            isLast
            rightEl={
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            }
          />
        </Section>

        {/* Data */}
        <Section title="DATA">
          <SettingRow
            label="Manage Domains & Activities"
            onPress={() => router.push('/manage-domains')}
            rightEl={<Feather name="layers" size={16} color={colors.mutedForeground} />}
          />
          <SettingRow
            label="Manage Tags"
            onPress={() => setShowTagManager(true)}
            rightEl={<Feather name="tag" size={16} color={colors.mutedForeground} />}
          />
          <SettingRow
            label={exporting ? 'Exporting...' : 'Export as CSV'}
            onPress={handleExport}
            rightEl={<Feather name="download" size={16} color={colors.mutedForeground} />}
          />
          <SettingRow
            label={generating ? 'Generating...' : 'Generate Day Wrap (AI)'}
            onPress={handleGenerateWrap}
            isLast
            rightEl={<Feather name="zap" size={16} color={colors.mutedForeground} />}
          />
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <SettingRow
            label="DaySync"
            isLast
            rightEl={<Text style={[styles.version, { color: colors.mutedForeground }]}>v1.0.0</Text>}
          />
        </Section>

        {/* Account */}
        <Section title="ACCOUNT">
          <SettingRow
            label="Log out"
            onPress={async () => {
              try {
                await logout();
              } catch (err: any) {
                Alert.alert('Error logging out', err.message);
              }
            }}
            isLast
            rightEl={<Feather name="log-out" size={16} color="#EF4444" />}
          />
        </Section>
      </ScrollView>

      <ExportModal
        visible={showExportModal}
        entries={entries}
        onClose={() => setShowExportModal(false)}
      />
      <TagManagerModal
        visible={showTagManager}
        onClose={() => setShowTagManager(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 32 },
  
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },

  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: -8 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  sectionBody: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingLabel: { fontSize: 15, fontFamily: 'Inter_400Regular', flex: 1 },
  segControl: { flexDirection: 'row', gap: 4 },
  seg: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  hourPicker: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hourText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', minWidth: 50, textAlign: 'center' },
  version: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
