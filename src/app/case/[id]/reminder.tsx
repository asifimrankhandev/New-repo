import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { DateField, TimeField } from '@/components/ui/date-field';
import { Notice } from '@/components/ui/notice';
import { OptionCards } from '@/components/ui/option-cards';
import { Screen } from '@/components/ui/screen';
import { SettingsGroup, SettingsSlot } from '@/components/ui/settings-group';
import { TopBar } from '@/components/ui/top-bar';
import {
  addDaysIso,
  combineDateAndTime,
  formatWeekdayDate,
  type IsoDate,
  todayIso,
  toIsoDate,
} from '@/domain/dates';
import { type ReminderType, reminderType } from '@/domain/enums';
import type { RefundCase, Reminder } from '@/domain/models';
import { selectCase } from '@/features/cases/case-repository';
import { MissingCase } from '@/features/cases/components/missing-case';
import {
  getNotificationPermission,
  type NotificationPermission,
  requestNotificationPermission,
} from '@/features/reminders/notification-service';
import {
  createReminder,
  deleteReminder,
  rescheduleReminder,
  selectRemindersForCase,
} from '@/features/reminders/reminder-repository';
import { usePreferences } from '@/features/settings/preferences-repository';
import { confirm, showError } from '@/lib/dialogs';
import { haptics } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { spacing } from '@/theme/tokens';

const REASONS = reminderType.values.map((value) => ({ value, title: reminderType.labels[value] }));

export default function ReminderScreen() {
  const params = useLocalSearchParams<{ id: string; reminderId?: string }>();
  const caseQuery = useLiveQuery(selectCase(params.id), [params.id]);
  const remindersQuery = useLiveQuery(selectRemindersForCase(params.id), [params.id]);

  if (caseQuery.updatedAt === undefined || remindersQuery.updatedAt === undefined) {
    return <Screen>{null}</Screen>;
  }
  const refundCase = caseQuery.data[0];
  if (!refundCase) return <MissingCase />;
  const existing = remindersQuery.data.find((item) => item.id === params.reminderId);
  return <ReminderForm refundCase={refundCase} existing={existing} />;
}

function ReminderForm({
  refundCase,
  existing,
}: {
  refundCase: RefundCase;
  existing: Reminder | undefined;
}) {
  const preferences = usePreferences();
  const now = useNow();
  const initialAt = existing ? new Date(existing.scheduledAt) : null;
  const [type, setType] = useState<ReminderType>(existing?.type ?? 'follow-up');
  const [date, setDate] = useState<IsoDate | ''>(
    initialAt ? toIsoDate(initialAt) : addDaysIso(todayIso(), 3),
  );
  const [time, setTime] = useState({
    hour: initialAt?.getHours() ?? preferences['reminder-hour'],
    minute: initialAt?.getMinutes() ?? preferences['reminder-minute'],
  });
  const [permission, setPermission] = useState<NotificationPermission>('granted');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getNotificationPermission().then(setPermission);
    }, []),
  );

  const today = todayIso(new Date(now));
  const quickPicks = [
    { label: 'Tomorrow', date: addDaysIso(today, 1) },
    { label: '3 days', date: addDaysIso(today, 3) },
    { label: '1 week', date: addDaysIso(today, 7) },
    ...(refundCase.expectedRefundDate && refundCase.expectedRefundDate >= today
      ? [{ label: 'After expected', date: addDaysIso(refundCase.expectedRefundDate, 1) }]
      : []),
  ];
  const scheduledAt = date ? combineDateAndTime(date, time.hour, time.minute) : null;
  const inPast = scheduledAt !== null && scheduledAt <= now;

  const save = async () => {
    if (!scheduledAt || scheduledAt <= Date.now()) return;
    setSaving(true);
    try {
      const granted =
        permission === 'undetermined'
          ? (await requestNotificationPermission()) === 'granted'
          : permission === 'granted';
      if (existing) {
        await rescheduleReminder(existing.id, scheduledAt, { type, reason: 'edit' });
      } else {
        await createReminder({ caseId: refundCase.id, type, scheduledAt });
      }
      haptics.success();
      if (!granted) {
        Alert.alert(
          'Reminder saved',
          'Notifications are off, so it will appear only in the Reminders tab.',
        );
      }
      router.back();
    } catch (error) {
      showError('Couldn’t save the reminder', error);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: 'Delete this reminder?',
      message: 'You won’t be notified.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await deleteReminder(existing.id);
      router.back();
    }
  };

  return (
    <Screen
      header={
        <TopBar title={refundCase.itemName} leading="close" onLeadingPress={() => router.back()} />
      }
      footer={
        <BottomBar>
          {existing ? (
            <Button label="Delete" variant="danger" onPress={() => void remove()} />
          ) : null}
          <Button
            label={
              date && !inPast
                ? `${existing ? 'Update' : 'Set'} reminder · ${formatWeekdayDate(date)}`
                : 'Choose a future time'
            }
            flex={1}
            disabled={!scheduledAt || inPast}
            loading={saving}
            onPress={() => void save()}
          />
        </BottomBar>
      }
    >
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Remind me to…
      </AppText>
      <OptionCards label="Reason" columns={1} options={REASONS} value={type} onChange={setType} />
      <View style={styles.group}>
        <AppText variant="label" tone="muted">
          When
        </AppText>
        <View style={styles.quick}>
          {quickPicks.map((pick) => (
            <Button
              key={pick.label}
              label={pick.label}
              size="small"
              variant={pick.date === date ? 'primary' : 'secondary'}
              accessibilityHint={formatWeekdayDate(pick.date)}
              onPress={() => setDate(pick.date)}
            />
          ))}
        </View>
        <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date(now)} />
      </View>
      <SettingsGroup>
        <SettingsSlot label="Time">
          <TimeField
            label="Time"
            hour={time.hour}
            minute={time.minute}
            onChange={(hour, minute) => setTime({ hour, minute })}
          />
        </SettingsSlot>
      </SettingsGroup>
      {inPast ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          That time has already passed.
        </AppText>
      ) : null}
      {permission === 'undetermined' ? (
        <Notice icon="bell" tone="inverse" title="Allow notifications?">
          We’ll only notify you at the time you choose. If you decline, reminders still show in the
          Reminders tab.
        </Notice>
      ) : null}
      {permission === 'denied' ? (
        <Notice
          icon="bellOff"
          tone="dashed"
          title="Notifications are off."
          action={
            <Button
              label="Open Settings"
              variant="secondary"
              size="small"
              onPress={() => void Linking.openSettings()}
            />
          }
        >
          This reminder will still appear in the Reminders tab.
        </Notice>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.sm },
  group: { gap: spacing.sm },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
