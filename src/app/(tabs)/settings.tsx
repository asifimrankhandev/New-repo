import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TimeField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SettingsGroup, SettingsRow, SettingsSlot } from '@/components/ui/settings-group';
import { SUPPORT_EMAIL } from '@/constants/app-info';
import { appearance } from '@/domain/enums';
import {
  deleteAllData,
  pickBackup,
  restoreBackup,
  shareBackup,
  shareCasesCsv,
} from '@/features/backup/backup-service';
import {
  getNotificationPermission,
  type NotificationPermission,
  requestNotificationPermission,
} from '@/features/reminders/notification-service';
import { syncReminderNotifications } from '@/features/reminders/reminder-repository';
import { setPreference, usePreferences } from '@/features/settings/preferences-repository';
import { confirm, showError } from '@/lib/dialogs';
import { spacing } from '@/theme/tokens';

const PERMISSION_LABELS: Record<NotificationPermission, string> = {
  granted: 'On',
  denied: 'Off',
  undetermined: 'Not set up',
};

export default function SettingsScreen() {
  const preferences = usePreferences();
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getNotificationPermission().then(setPermission);
    }, []),
  );

  const run = async (key: string, task: () => Promise<void>, errorTitle: string) => {
    setBusy(key);
    try {
      await task();
    } catch (error) {
      showError(errorTitle, error);
    } finally {
      setBusy(null);
    }
  };

  const handleNotifications = async () => {
    if (permission === 'undetermined') {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') await syncReminderNotifications();
    } else {
      await Linking.openSettings();
    }
  };

  const handleRestore = () =>
    run(
      'restore',
      async () => {
        const backup = await pickBackup();
        if (!backup) return;
        const proceed = await confirm({
          title: 'Replace all data?',
          message: `This backup has ${backup.data.cases.length} cases. Restoring replaces everything currently on this device.`,
          confirmLabel: 'Restore',
          destructive: true,
        });
        if (!proceed) return;
        const result = await restoreBackup(backup);
        Alert.alert(
          'Backup restored',
          result.missingFiles > 0
            ? `${result.caseCount} cases restored. ${result.missingFiles} evidence files were missing from the backup.`
            : `${result.caseCount} cases restored.`,
        );
      },
      'Couldn’t restore the backup',
    );

  const handleDeleteAll = async () => {
    const proceed = await confirm({
      title: 'Delete all data?',
      message:
        'Every case, evidence file and reminder on this device will be permanently deleted. Export a backup first if you might need them.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!proceed) return;
    await run('delete', deleteAllData, 'Couldn’t delete your data');
    router.replace('/welcome');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="label" tone="muted">
          Stored on this device
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          Settings
        </AppText>
      </View>

      <SettingsGroup title="Reminders">
        <SettingsRow
          label="Notifications"
          value={PERMISSION_LABELS[permission]}
          onPress={() => void handleNotifications()}
          accessibilityHint={
            permission === 'undetermined' ? 'Asks for permission' : 'Opens system settings'
          }
        />
        <SettingsSlot label="Default reminder time">
          <TimeField
            label="Default reminder time"
            hour={preferences['reminder-hour']}
            minute={preferences['reminder-minute']}
            onChange={(hour, minute) => {
              setPreference('reminder-hour', hour);
              setPreference('reminder-minute', minute);
            }}
          />
        </SettingsSlot>
      </SettingsGroup>

      <SettingsGroup title="Your data">
        <SettingsRow
          label="Back up everything"
          value={busy === 'backup' ? 'Preparing…' : 'JSON'}
          onPress={() => void run('backup', shareBackup, 'Couldn’t create the backup')}
          accessibilityHint="Creates a file with all cases and evidence, then opens the share sheet"
        />
        <SettingsRow
          label="Export cases as spreadsheet"
          value="CSV"
          onPress={() => void run('csv', shareCasesCsv, 'Couldn’t export your cases')}
        />
        <SettingsRow
          label="Restore from backup"
          value={busy === 'restore' ? 'Restoring…' : undefined}
          onPress={() => void handleRestore()}
        />
      </SettingsGroup>
      <AppText variant="small" tone="muted" style={styles.footnote}>
        Backups aren’t encrypted. Store them somewhere private — they contain your receipts and
        order details.
      </AppText>

      <SettingsGroup title="App">
        <SettingsSlot label="Appearance">
          <View style={styles.appearance}>
            <SegmentedControl
              accessibilityLabel="Appearance"
              value={preferences.appearance}
              onChange={(value) => setPreference('appearance', value)}
              options={appearance.values.map((value) => ({
                value,
                label: appearance.labels[value],
              }))}
            />
          </View>
        </SettingsSlot>
        <SettingsRow label="Currency" value="US Dollar (USD)" />
        <SettingsRow label="Privacy & terms" onPress={() => router.push('/privacy')} />
        <SettingsRow
          label="Contact support"
          value={`v${Constants.expoConfig?.version ?? '1.0.0'}`}
          onPress={() =>
            void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=RefundBeacon%20support`)
          }
          accessibilityHint="Opens your email app. Don’t include receipts or card details."
        />
      </SettingsGroup>

      <Button
        label="Delete all data on this device"
        variant="danger"
        size="medium"
        loading={busy === 'delete'}
        onPress={() => void handleDeleteAll()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.xl },
  appearance: { width: 210 },
  footnote: { marginTop: -spacing.sm },
});
