import { and, desc, eq, isNotNull, isNull, like, or } from 'drizzle-orm';

import { db, type Transaction } from '@/db/client';
import { cases, refundEntries, reminders, timelineEvents } from '@/db/schema';
import { inferInitialStatus } from '@/domain/case-state';
import type { CaseInput } from '@/domain/case-input';
import { fromIsoDate } from '@/domain/dates';
import type { CaseStatus, EventSource, EventType } from '@/domain/enums';
import type { RefundCase } from '@/domain/models';
import { createId } from '@/lib/create-id';

export function selectAllCases() {
  return db.select().from(cases).orderBy(desc(cases.updatedAt));
}

export function selectActiveCases() {
  return db.select().from(cases).where(isNull(cases.archivedAt)).orderBy(desc(cases.updatedAt));
}

export function selectArchivedCases() {
  return db.select().from(cases).where(isNotNull(cases.archivedAt)).orderBy(desc(cases.archivedAt));
}

export function selectCase(id: string) {
  return db.select().from(cases).where(eq(cases.id, id)).limit(1);
}

/** Local search over retailer, item, title and order reference. */
export function searchCases(term: string) {
  const pattern = `%${term.replace(/[%_]/g, '')}%`;
  return db
    .select()
    .from(cases)
    .where(
      or(
        like(cases.retailerName, pattern),
        like(cases.itemName, pattern),
        like(cases.title, pattern),
        like(cases.orderReference, pattern),
      ),
    )
    .orderBy(desc(cases.updatedAt))
    .limit(50);
}

export function getAllCases(): RefundCase[] {
  return db.select().from(cases).all();
}

export function getCase(id: string): RefundCase | undefined {
  return db.select().from(cases).where(eq(cases.id, id)).get();
}

/** Midday of a calendar date, so date-only events sort sensibly and survive DST shifts. */
export function middayOf(isoDate: string | null, fallback: number): number {
  if (!isoDate) return fallback;
  const date = fromIsoDate(isoDate);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

export function insertEvent(
  tx: Transaction | typeof db,
  event: {
    caseId: string;
    type: EventType;
    source: EventSource;
    occurredAt: number;
    description?: string | null;
    amountCents?: number | null;
  },
) {
  tx.insert(timelineEvents)
    .values({
      id: createId(),
      caseId: event.caseId,
      type: event.type,
      source: event.source,
      occurredAt: event.occurredAt,
      description: event.description ?? null,
      amountCents: event.amountCents ?? null,
      createdAt: Date.now(),
    })
    .run();
}

export function touchCase(tx: Transaction | typeof db, caseId: string) {
  tx.update(cases).set({ updatedAt: Date.now() }).where(eq(cases.id, caseId)).run();
}

/** Creates a case and seeds its timeline from the dates the user entered. */
export function createCase(input: CaseInput, options: { isSample?: boolean } = {}): string {
  const id = createId();
  const now = Date.now();
  db.transaction((tx) => {
    tx.insert(cases)
      .values({
        ...input,
        id,
        title: input.itemName,
        currencyCode: 'USD',
        returnInitiatedDate: null,
        status: inferInitialStatus(input),
        dismissedNextStep: null,
        isSample: options.isSample ?? false,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      })
      .run();
    insertEvent(tx, {
      caseId: id,
      type: 'purchase-recorded',
      source: 'user',
      occurredAt: middayOf(input.purchaseDate, now),
      amountCents: input.purchaseAmountCents,
    });
    if (input.handoffDate) {
      insertEvent(tx, {
        caseId: id,
        type: 'item-dropped-off',
        source: 'user',
        occurredAt: middayOf(input.handoffDate, now),
        description: input.carrierName ? `Handed to ${input.carrierName}` : null,
      });
    }
  });
  return id;
}

export function updateCase(id: string, input: CaseInput) {
  db.transaction((tx) => {
    const existing = tx.select().from(cases).where(eq(cases.id, id)).get();
    if (!existing) throw new Error('Case not found');
    // Recording a hand-over date for the first time advances a planned return.
    const status =
      !existing.handoffDate && input.handoffDate && existing.status === 'return-planned'
        ? inferInitialStatus(input)
        : existing.status;
    tx.update(cases)
      .set({ ...input, title: input.itemName, status, updatedAt: Date.now() })
      .where(eq(cases.id, id))
      .run();
    if (!existing.handoffDate && input.handoffDate) {
      insertEvent(tx, {
        caseId: id,
        type: 'item-dropped-off',
        source: 'user',
        occurredAt: middayOf(input.handoffDate, Date.now()),
      });
    }
  });
}

export function setCaseStatus(tx: Transaction | typeof db, caseId: string, status: CaseStatus) {
  tx.update(cases)
    .set({ status, updatedAt: Date.now(), dismissedNextStep: null })
    .where(eq(cases.id, caseId))
    .run();
}

export function setArchived(caseId: string, archived: boolean) {
  db.update(cases)
    .set({ archivedAt: archived ? Date.now() : null, updatedAt: Date.now() })
    .where(eq(cases.id, caseId))
    .run();
}

export function dismissNextStep(caseId: string, key: string | null) {
  db.update(cases).set({ dismissedNextStep: key }).where(eq(cases.id, caseId)).run();
}

/** Reopens a resolved case, keeping all refund entries and history. */
export function reopenCase(caseId: string) {
  db.transaction((tx) => {
    const hasCash = tx
      .select({ id: refundEntries.id })
      .from(refundEntries)
      .where(and(eq(refundEntries.caseId, caseId), eq(refundEntries.kind, 'cash')))
      .get();
    setCaseStatus(tx, caseId, hasCash ? 'partial-refund' : 'refund-pending');
    tx.update(cases).set({ archivedAt: null }).where(eq(cases.id, caseId)).run();
    insertEvent(tx, { caseId, type: 'case-reopened', source: 'user', occurredAt: Date.now() });
  });
}

export function deleteCaseRecords(caseId: string) {
  // Events, evidence rows, refund entries and reminders cascade via foreign keys.
  db.delete(cases).where(eq(cases.id, caseId)).run();
}

export function selectPendingRemindersForCase(caseId: string) {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.caseId, caseId), isNull(reminders.completedAt)))
    .all();
}
