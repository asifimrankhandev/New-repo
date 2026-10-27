import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { reminderShortLabels } from '@/domain/enums';
import type { RefundCase, Reminder } from '@/domain/models';

const CHANNEL_ID = 'reminders';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** Call once at startup: foreground presentation and the Android channel. */
export async function configureNotifications() {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Case reminders',
      description: 'Reminders you set for your refund cases',
      importance: AndroidImportance.DEFAULT,
    });
  }
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  const { status } = await getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** Only called after the user opts in to a reminder — never on launch. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const current = await getNotificationPermission();
  if (current !== 'undetermined') return current;
  const { status } = await requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

function contentFor(reminder: Reminder, refundCase: Pick<RefundCase, 'retailerName' | 'itemName'>) {
  const title =
    reminder.type === 'follow-up'
      ? `Follow up with ${refundCase.retailerName}`
      : `${reminderShortLabels[reminder.type]}: ${refundCase.retailerName}`;
  return {
    title,
    body: `${refundCase.itemName} — open the case to review your next step.`,
    data: { caseId: reminder.caseId, reminderId: reminder.id },
  };
}

/** Uses the reminder id as the notification identifier so scheduling is idempotent. */
export async function scheduleReminderNotification(
  reminder: Reminder,
  refundCase: Pick<RefundCase, 'retailerName' | 'itemName'>,
): Promise<boolean> {
  if (reminder.completedAt !== null || reminder.scheduledAt <= Date.now()) return false;
  if ((await getNotificationPermission()) !== 'granted') return false;
  await scheduleNotificationAsync({
    identifier: reminder.id,
    content: contentFor(reminder, refundCase),
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: reminder.scheduledAt,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}

export async function cancelReminderNotification(reminderId: string) {
  await cancelScheduledNotificationAsync(reminderId);
}

export async function cancelAllNotifications() {
  await cancelAllScheduledNotificationsAsync();
}

/**
 * Makes the OS schedule match the database: removes stale notifications and schedules any
 * missing ones. Safe to call on every launch, after restore and after permission changes.
 */
export async function reconcileNotifications(
  pending: readonly {
    reminder: Reminder;
    refundCase: Pick<RefundCase, 'retailerName' | 'itemName'>;
  }[],
) {
  const scheduled = await getAllScheduledNotificationsAsync();
  const wanted = new Map(pending.map((item) => [item.reminder.id, item]));
  const scheduledIds = new Set(scheduled.map((request) => request.identifier));

  await Promise.all(
    scheduled
      .filter((request) => !wanted.has(request.identifier))
      .map((request) => cancelScheduledNotificationAsync(request.identifier)),
  );
  for (const item of pending) {
    if (!scheduledIds.has(item.reminder.id)) {
      await scheduleReminderNotification(item.reminder, item.refundCase);
    }
  }
}
