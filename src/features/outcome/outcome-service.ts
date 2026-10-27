import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { refundEntries } from '@/db/schema';
import type { IsoDate } from '@/domain/dates';
import type {
  CaseStatus,
  ConfirmationSource,
  EventType,
  OutcomeType,
  RefundKind,
} from '@/domain/enums';
import { insertEvent, middayOf, setCaseStatus } from '@/features/cases/case-repository';
import {
  cancelNotifications,
  completeCaseReminders,
} from '@/features/reminders/reminder-repository';
import { createId } from '@/lib/create-id';

export interface OutcomeInput {
  caseId: string;
  outcome: OutcomeType;
  amountCents: number | null;
  receivedDate: IsoDate;
  confirmationSource: ConfirmationSource;
  note: string | null;
}

const OUTCOME_EFFECTS: Record<
  OutcomeType,
  { status: CaseStatus; event: EventType; entryKind: RefundKind | null; resolves: boolean }
> = {
  'full-refund': {
    status: 'refunded',
    event: 'full-refund-received',
    entryKind: 'cash',
    resolves: true,
  },
  'partial-refund': {
    status: 'partial-refund',
    event: 'partial-refund-received',
    entryKind: 'cash',
    resolves: false,
  },
  'store-credit': {
    status: 'store-credit',
    event: 'store-credit-issued',
    entryKind: 'store-credit',
    resolves: true,
  },
  exchange: {
    status: 'store-credit',
    event: 'exchange-issued',
    entryKind: 'exchange',
    resolves: true,
  },
  rejected: { status: 'rejected', event: 'refund-rejected', entryKind: null, resolves: false },
  closed: { status: 'closed', event: 'case-closed', entryKind: null, resolves: true },
};

export function outcomeNeedsAmount(outcome: OutcomeType): boolean {
  return OUTCOME_EFFECTS[outcome].entryKind !== null;
}

/**
 * Records what the user confirmed happened. Nothing is ever marked received automatically,
 * and resolving a case stops its reminders.
 */
export async function recordOutcome(input: OutcomeInput) {
  const effect = OUTCOME_EFFECTS[input.outcome];
  if (effect.entryKind && (input.amountCents === null || input.amountCents <= 0)) {
    throw new Error('An amount is required for this outcome.');
  }
  let cancelledReminders: string[] = [];
  db.transaction((tx) => {
    if (effect.entryKind && input.amountCents !== null) {
      tx.insert(refundEntries)
        .values({
          id: createId(),
          caseId: input.caseId,
          kind: effect.entryKind,
          amountCents: input.amountCents,
          receivedDate: input.receivedDate,
          confirmationSource: input.confirmationSource,
          note: input.note,
          createdAt: Date.now(),
        })
        .run();
    }
    insertEvent(tx, {
      caseId: input.caseId,
      type: effect.event,
      source: 'user',
      occurredAt: middayOf(input.receivedDate, Date.now()),
      amountCents: input.amountCents,
      description: input.note,
    });
    setCaseStatus(tx, input.caseId, effect.status);
    if (effect.resolves) cancelledReminders = completeCaseReminders(tx, input.caseId);
  });
  await cancelNotifications(cancelledReminders);
}

export function deleteRefundEntry(id: string) {
  db.delete(refundEntries).where(eq(refundEntries.id, id)).run();
}

export function selectAllRefundEntries() {
  return db.select().from(refundEntries);
}

export function selectRefundEntriesForCase(caseId: string) {
  return db.select().from(refundEntries).where(eq(refundEntries.caseId, caseId));
}
