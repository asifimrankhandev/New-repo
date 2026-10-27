import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Transaction } from '@/db/client';
import { cases, reminders } from '@/db/schema';
import type { ReminderType } from '@/domain/enums';
import type { Reminder } from '@/domain/models';
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

export async function createReminder(input: {
  caseId: string;
  type: ReminderType;
  scheduledAt: number;
}): Promise<{ reminder: Reminder; notificationScheduled: boolean }> {
  const reminder: Reminder = { id: createId(), ...input, completedAt: null, createdAt: Date.now() };
  db.insert(reminders).values(reminder).run();
  const refundCase = db.select().from(cases).where(eq(cases.id, input.caseId)).get();
  const notificationScheduled = refundCase
    ? await scheduleReminderNotification(reminder, refundCase)
    : false;
  return { reminder, notificationScheduled };
}

export async function rescheduleReminder(id: string, scheduledAt: number, type?: ReminderType) {
  db.update(reminders)
    .set({ scheduledAt, ...(type ? { type } : {}) })
    .where(eq(reminders.id, id))
    .run();
  await cancelReminderNotification(id);
  const reminder = getReminder(id);
  const refundCase = reminder
    ? db.select().from(cases).where(eq(cases.id, reminder.caseId)).get()
    : undefined;
  if (reminder && refundCase) await scheduleReminderNotification(reminder, refundCase);
}

export async function completeReminder(id: string) {
  db.update(reminders).set({ completedAt: Date.now() }).where(eq(reminders.id, id)).run();
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
