import { Platform } from 'react-native';
import { Settings } from '@/types';
import { getNextTargetTime } from '@/utils/time';
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
  
  // 1. Morning Kickoff
  const startOfDay = new Date(now);
  startOfDay.setHours(settings.activeStart, 0, 0, 0);
  if (now.getTime() < startOfDay.getTime()) {
    await N.scheduleNotificationAsync({
      content: { title: 'DaySync', body: getRandomPrompt('kickoff'), data: { action: 'checkin' } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: startOfDay },
    });
  }

  // 2. Continuous Dynamic Reminders
  let currentTargetMs = getNextTargetTime(settings.interval, settings.activeStart, settings.activeEnd);
  const endOfDay = new Date(now);
  endOfDay.setHours(settings.activeEnd, 0, 0, 0);

  let isFirst = true;
  let count = 0;

  // We need to advance currentTargetMs if it's based strictly on the schedule and we already missed some today.
  // Wait, getNextTargetTime already calculates the NEXT future time strictly based on the schedule, so we don't need to advance it!
  // BUT wait, what if the user JUST logged an entry?
  // Since we reverted to the rigid system, we want to schedule the REST of the day's notifications starting from the NEXT rigid boundary.
  
  while (currentTargetMs < endOfDay.getTime() && count < 60) {
    if (currentTargetMs > now.getTime()) {
      // Main Check-in or Missed L2 if they've completely ignored it for cycles
      const promptType = isFirst ? 'checkin' : 'missed_l2';
      await N.scheduleNotificationAsync({
        content: { title: 'DaySync', body: getRandomPrompt(promptType), data: { action: 'checkin' } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(currentTargetMs) },
      });

      // Schedule a Missed L1 guilt-trip 15 minutes after the VERY FIRST missed target
      if (isFirst) {
        const missedL1Ms = currentTargetMs + (15 * 60 * 1000);
        if (missedL1Ms < endOfDay.getTime() && missedL1Ms < currentTargetMs + (settings.interval * 60 * 1000)) {
          await N.scheduleNotificationAsync({
            content: { title: 'DaySync', body: getRandomPrompt('missed_l1'), data: { action: 'checkin' } },
            trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(missedL1Ms) },
          });
        }
      }
    }
    
    // Advance to the next interval boundary
    currentTargetMs += (settings.interval * 60 * 1000);
    isFirst = false;
    count++;
  }

  // 3. End of Day Wrap-up
  if (now.getTime() < endOfDay.getTime()) {
    await N.scheduleNotificationAsync({
      content: { title: 'DaySync', body: getRandomPrompt('wrapup'), data: { action: 'wrapup' } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: endOfDay },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}
