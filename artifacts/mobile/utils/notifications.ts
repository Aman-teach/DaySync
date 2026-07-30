import { Platform } from 'react-native';
import { Settings } from '@/types';
import { getRandomPrompt } from '@/constants/notificationPrompts';

type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return Notifications;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminders(settings: Settings, latestEntryMs: number | null = null): Promise<void> {
  const N = await getNotifications();
  if (!N || !settings.notificationsEnabled) return;

  await N.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  
  // To avoid hitting the 64 notification limit on iOS, we calculate the next 60 valid target times.
  let current = new Date(now);
  const intervalMs = settings.interval * 60 * 1000;
  
  // Align current to the next valid interval boundary of the activeStart
  let startOfDay = new Date(current);
  startOfDay.setHours(settings.activeStart, 0, 0, 0);
  
  if (current.getTime() < startOfDay.getTime()) {
    current = new Date(startOfDay);
  } else {
    const elapsed = current.getTime() - startOfDay.getTime();
    current.setTime(startOfDay.getTime() + Math.ceil(elapsed / intervalMs) * intervalMs);
    if (current.getTime() === now.getTime()) {
       current.setTime(current.getTime() + intervalMs);
    }
  }

  let count = 0;
  let isFirst = true;

  while (count < 60) {
    const hour = current.getHours();
    
    // Check if we passed the end of the active window for this day
    if (hour >= settings.activeEnd) {
      // Jump to the next day's active start
      current.setDate(current.getDate() + 1);
      current.setHours(settings.activeStart, 0, 0, 0);
      
      // Schedule morning kickoff
      await N.scheduleNotificationAsync({
        content: { title: 'DaySync', body: getRandomPrompt('kickoff'), data: { action: 'checkin' } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(current) },
      });
      count++;
      
      // Schedule end of day wrap-up for the new day
      const wrapUp = new Date(current);
      wrapUp.setHours(settings.activeEnd, 0, 0, 0);
      await N.scheduleNotificationAsync({
        content: { title: 'DaySync', body: getRandomPrompt('wrapup'), data: { action: 'wrapup' } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: wrapUp },
      });
      count++;
      continue;
    }
    
    // Check if we are before the active start (should only happen on day 1 if run early)
    if (hour < settings.activeStart) {
      current.setHours(settings.activeStart, 0, 0, 0);
      continue;
    }

    // Schedule the check-in
    const promptType = isFirst ? 'checkin' : 'missed_l2';
    await N.scheduleNotificationAsync({
      content: { title: 'DaySync', body: getRandomPrompt(promptType), data: { action: 'checkin' } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(current) },
    });
    count++;

    // Schedule Missed L1 guilt-trip 15 minutes after the first ignored one
    if (isFirst) {
      const missedL1 = new Date(current.getTime() + 15 * 60 * 1000);
      if (missedL1.getHours() < settings.activeEnd && missedL1.getTime() < current.getTime() + intervalMs) {
        await N.scheduleNotificationAsync({
          content: { title: 'DaySync', body: getRandomPrompt('missed_l1'), data: { action: 'checkin' } },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: missedL1 },
        });
        count++;
      }
    }

    isFirst = false;
    current.setTime(current.getTime() + intervalMs);
  }
}

export async function cancelAllReminders(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}

