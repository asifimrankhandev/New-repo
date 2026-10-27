import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '@/db/client';
import { cases, reminders } from '@/db/schema';
import { formatTime, formatWeekdayDate } from '@/domain/dates';
import { type EventType, type ReminderType, reminderShortLabels } from '@/domain/enums';
import type { Reminder } from '@/domain/models';
import { insertEvent } from '@/features/cases/case-repository';
import { createId } from '@/lib/create-id';

import {
  cancelReminderNotification,
  reconcileNotifications,
  scheduleReminderNotification,
} from './notification-service';

/** Pending reminders with their case, soonest first (for the Reminders tab). */
export function selectPendingReminders() {
  return db
    .select({ reminder: reminders, refundCase: cases })
    .from(reminders)
    .innerJoin(cases, eq(reminders.caseId, cases.id))
    .where(and(isNull(reminders.completedAt), isNull(cases.archivedAt)))
    .orderBy(asc(reminders.scheduledAt));
}

export function selectRemindersForCase(caseId: string) {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.caseId, caseId), isNull(reminders.completedAt)))
    .orderBy(asc(reminders.scheduledAt));
}

function getReminder(id: string): Reminder | undefined {
  return db.select().from(reminders).where(eq(reminders.id, id)).get();
}

function describe(reminder: Pick<Reminder, 'type' | 'scheduledAt'>): string {
  const at = new Date(reminder.scheduledAt);
  return `${reminderShortLabels[reminder.type]} · ${formatWeekdayDate(at)}, ${formatTime(at)}`;
}

/** Reminder activity is part of the case history, recorded by the app (not the user). */
function logReminderEvent(reminder: Reminder, type: EventType) {
  insertEvent(db, {
    caseId: reminder.caseId,
    type,
    source: 'system',
    occurredAt: Date.now(),
    description: describe(reminder),
  });
}

export async function createReminder(input: {
  caseId: string;
  type: ReminderType;
  scheduledAt: number;
}): Promise<{ reminder: Reminder; notificationScheduled: boolean }> {
  const reminder: Reminder = { id: createId(), ...input, completedAt: null, createdAt: Date.now() };
  db.insert(reminders).values(reminder).run();
  logReminderEvent(reminder, 'reminder-set');
  const refundCase = db.select().from(cases).where(eq(cases.id, input.caseId)).get();
  const notificationScheduled = refundCase
    ? await scheduleReminderNotification(reminder, refundCase)
    : false;
  return { reminder, notificationScheduled };
}

export async function rescheduleReminder(
  id: string,
  scheduledAt: number,
  options: { type?: ReminderType; reason: 'edit' | 'snooze' },
) {
  db.update(reminders)
    .set({ scheduledAt, ...(options.type ? { type: options.type } : {}) })
    .where(eq(reminders.id, id))
    .run();
  await cancelReminderNotification(id);
  const reminder = getReminder(id);
  if (!reminder) return;
  logReminderEvent(reminder, options.reason === 'snooze' ? 'reminder-snoozed' : 'reminder-set');
  const refundCase = db.select().from(cases).where(eq(cases.id, reminder.caseId)).get();
  if (refundCase) await scheduleReminderNotification(reminder, refundCase);
}

export async function completeReminder(id: string) {
  db.update(reminders).set({ completedAt: Date.now() }).where(eq(reminders.id, id)).run();
  const reminder = getReminder(id);
  if (reminder) logReminderEvent(reminder, 'reminder-completed');
  await cancelReminderNotification(id);
}

export async function deleteReminder(id: string) {
  db.delete(reminders).where(eq(reminders.id, id)).run();
  await cancelReminderNotification(id);
}

/** Marks a case's reminders done inside a transaction; call `cancelCaseNotifications` after. */
export function completeCaseReminders(tx: Transaction | typeof db, caseId: string): string[] {
  const pending = tx
    .select({ id: reminders.id })
    .from(reminders)
    .where(and(eq(reminders.caseId, caseId), isNull(reminders.completedAt)))
    .all();
  tx.update(reminders)
    .set({ completedAt: Date.now() })
    .where(and(eq(reminders.caseId, caseId), isNull(reminders.completedAt)))
    .run();
  return pending.map((row) => row.id);
}

export async function cancelNotifications(reminderIds: readonly string[]) {
  await Promise.all(reminderIds.map(cancelReminderNotification));
}

/** Syncs OS notifications with the database (launch, restore, permission granted). */
export async function syncReminderNotifications() {
  const pending = selectPendingReminders()
    .all()
    .filter((row) => row.reminder.scheduledAt > Date.now());
  await reconcileNotifications(pending);
}
