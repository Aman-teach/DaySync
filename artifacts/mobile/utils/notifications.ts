import { Platform } from 'react-native';
import { Settings } from '@/types';
import { REMINDER_PROMPTS } from '@/constants/prompts';

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

export async function scheduleReminders(settings: Settings): Promise<void> {
  const N = await getNotifications();
  if (!N || !settings.notificationsEnabled) return;

  await N.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  let next = new Date(now);
  let count = 0;

  while (count < 20) {
    next = new Date(next.getTime() + settings.interval * 60 * 1000);
    const hour = next.getHours();
    if (hour < settings.activeStart) {
      next.setHours(settings.activeStart, 0, 0, 0);
    } else if (hour >= settings.activeEnd) {
      next.setDate(next.getDate() + 1);
      next.setHours(settings.activeStart, 0, 0, 0);
    }
    const prompt = REMINDER_PROMPTS[count % REMINDER_PROMPTS.length];
    await N.scheduleNotificationAsync({
      content: {
        title: 'Atlas Cadence',
        body: prompt,
        data: { action: 'checkin' },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: next,
      },
    });
    count++;
  }
}

export async function cancelAllReminders(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}
