import { useLastNotificationResponse } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Appearance, Platform } from 'react-native';

import { configureNotifications } from '@/features/reminders/notification-service';
import { syncReminderNotifications } from '@/features/reminders/reminder-repository';
import { usePreferences } from '@/features/settings/preferences-repository';

/** Local notifications and the appearance override exist only on iOS and Android. */
const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

/** Best-effort: a notification failure must never take the app down. */
function syncSafely() {
  syncReminderNotifications().catch(() => undefined);
}

/**
 * App-wide side effects that need the database: appearance override, notification setup,
 * keeping scheduled reminders in sync, and opening a case from a tapped notification.
 */
export function AppLifecycle() {
  const { appearance } = usePreferences();

  useEffect(() => {
    if (IS_NATIVE) Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  useEffect(() => {
    if (!IS_NATIVE) return;
    configureNotifications()
      .then(syncSafely)
      .catch(() => undefined);
    // Re-sync when returning to the app: the user may have changed notification permission.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncSafely();
    });
    return () => subscription.remove();
  }, []);

  return IS_NATIVE ? <NotificationRouter /> : null;
}

/** Opens the case behind a tapped reminder notification, including on cold start. */
function NotificationRouter() {
  const lastResponse = useLastNotificationResponse();

  useEffect(() => {
    const caseId = lastResponse?.notification.request.content.data?.caseId;
    if (typeof caseId === 'string') {
      router.push({ pathname: '/case/[id]', params: { id: caseId } });
    }
  }, [lastResponse]);

  return null;
}
