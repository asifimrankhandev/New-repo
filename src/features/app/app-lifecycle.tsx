import { useLastNotificationResponse } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Appearance } from 'react-native';

import { configureNotifications } from '@/features/reminders/notification-service';
import { syncReminderNotifications } from '@/features/reminders/reminder-repository';
import { usePreferences } from '@/features/settings/preferences-repository';

/**
 * App-wide side effects that need the database: appearance override, notification setup,
 * keeping scheduled reminders in sync, and opening a case from a tapped notification.
 */
export function AppLifecycle() {
  const { appearance } = usePreferences();
  const lastResponse = useLastNotificationResponse();

  useEffect(() => {
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  useEffect(() => {
    void configureNotifications().then(syncReminderNotifications);
    // Re-sync when returning to the app: the user may have changed notification permission.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncReminderNotifications();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const caseId = lastResponse?.notification.request.content.data?.caseId;
    if (typeof caseId === 'string') {
      router.push({ pathname: '/case/[id]', params: { id: caseId } });
    }
  }, [lastResponse]);

  return null;
}
