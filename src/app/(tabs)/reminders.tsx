import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusTag } from '@/components/ui/status-tag';
import { formatDateParts, formatTime } from '@/domain/dates';
import { reminderShortLabels, reminderType } from '@/domain/enums';
import type { RefundCase, Reminder } from '@/domain/models';
import {
  getNotificationPermission,
  type NotificationPermission,
} from '@/features/reminders/notification-service';
import {
  completeReminder,
  rescheduleReminder,
  selectPendingReminders,
} from '@/features/reminders/reminder-repository';
import { endOfDay, useNow } from '@/lib/use-now';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

const DAY_MS = 86_400_000;

function openCase(caseId: string) {
  router.push({ pathname: '/case/[id]', params: { id: caseId } });
}

function DueReminderCard({
  reminder,
  refundCase,
  now,
}: {
  reminder: Reminder;
  refundCase: RefundCase;
  now: number;
}) {
  const overdue = reminder.scheduledAt < now;
  return (
    <Card>
      <View style={styles.cardHeader}>
        <StatusTag label={reminderShortLabels[reminder.type]} tone="accent" />
        <AppText variant="mono">{overdue ? 'Due now' : formatTime(reminder.scheduledAt)}</AppText>
      </View>
      <View>
        <AppText variant="heading">
          {reminder.type === 'follow-up'
            ? `Contact ${refundCase.retailerName}`
            : reminderType.labels[reminder.type]}
        </AppText>
        <AppText variant="caption" tone="muted">
          {`${refundCase.itemName} · ${refundCase.retailerName}`}
        </AppText>
      </View>
      <View style={styles.cardActions}>
        <Button label="Open case" size="medium" flex={1} onPress={() => openCase(refundCase.id)} />
        <Button
          label="Snooze"
          variant="secondary"
          size="medium"
          accessibilityHint="Moves the reminder to tomorrow at the same time"
          onPress={() =>
            void rescheduleReminder(
              reminder.id,
              Math.max(reminder.scheduledAt, Date.now()) + DAY_MS,
            )
          }
        />
        <IconButton
          icon="check"
          accessibilityLabel="Mark done"
          onPress={() => void completeReminder(reminder.id)}
        />
      </View>
    </Card>
  );
}

function UpcomingRow({ reminder, refundCase }: { reminder: Reminder; refundCase: RefundCase }) {
  const { colors } = useTheme();
  const parts = formatDateParts(reminder.scheduledAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reminderType.labels[reminder.type]}, ${refundCase.retailerName}, ${parts.month} ${parts.day} at ${formatTime(reminder.scheduledAt)}`}
      onPress={() =>
        router.push({
          pathname: '/case/[id]/reminder',
          params: { id: refundCase.id, reminderId: reminder.id },
        })
      }
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.line },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={styles.dateGutter}>
        <AppText variant="label" tone="muted" style={styles.month}>
          {parts.month}
        </AppText>
        <AppText variant="mono" style={styles.day}>
          {parts.day}
        </AppText>
      </View>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{reminderShortLabels[reminder.type]}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {`${refundCase.retailerName} · ${refundCase.itemName}`}
        </AppText>
      </View>
      <AppText variant="mono" tone="muted">
        {formatTime(reminder.scheduledAt)}
      </AppText>
    </Pressable>
  );
}

export default function RemindersScreen() {
  const { data } = useLiveQuery(selectPendingReminders());
  const [permission, setPermission] = useState<NotificationPermission>('granted');
  const now = useNow();

  useFocusEffect(
    useCallback(() => {
      void getNotificationPermission().then(setPermission);
    }, []),
  );

  const dueBy = endOfDay(now);
  const due = data.filter((row) => row.reminder.scheduledAt <= dueBy);
  const upcoming = data.filter((row) => row.reminder.scheduledAt > dueBy);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="label" tone="muted">
          {`${data.length} scheduled · ${due.length} today`}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          Reminders
        </AppText>
      </View>

      {data.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          body="Set a reminder from any case — for example, to follow up if the refund hasn’t arrived by the date the retailer gave you."
        />
      ) : null}

      {due.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Today" />
          {due.map((row) => (
            <DueReminderCard
              key={row.reminder.id}
              reminder={row.reminder}
              refundCase={row.refundCase}
              now={now}
            />
          ))}
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <View>
          <SectionHeader title="Upcoming" />
          {upcoming.map((row) => (
            <UpcomingRow
              key={row.reminder.id}
              reminder={row.reminder}
              refundCase={row.refundCase}
            />
          ))}
        </View>
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
          Reminders still appear here, so you won’t lose track.
        </Notice>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.xl },
  section: { gap: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 68,
    borderBottomWidth: 1,
  },
  dateGutter: { width: 44 },
  month: { fontSize: 10.5 },
  day: { fontSize: 22, lineHeight: 26 },
  rowText: { flex: 1 },
});
