import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { timelineEvents } from '@/db/schema';
import { statusAfterHandOff } from '@/domain/case-state';
import {
  type CaseStatus,
  type EventSource,
  type EventType,
  isResolvedStatus,
} from '@/domain/enums';
import type { RefundCase } from '@/domain/models';
import { getCase, insertEvent, setCaseStatus, touchCase } from '@/features/cases/case-repository';

export interface NewEventInput {
  caseId: string;
  type: EventType;
  source: EventSource;
  occurredAt: number;
  description: string | null;
}

/** Status a manual event implies. Only events that unambiguously move the case are mapped. */
function statusAfterEvent(refundCase: RefundCase, type: EventType): CaseStatus | null {
  if (isResolvedStatus(refundCase.status)) return null;
  switch (type) {
    case 'item-dropped-off':
      return refundCase.status === 'return-planned' || refundCase.status === 'draft'
        ? statusAfterHandOff(refundCase.returnMethod)
        : null;
    case 'delivered':
      return refundCase.status === 'return-in-transit' || refundCase.status === 'return-planned'
        ? 'delivered'
        : null;
    case 'refund-approved':
    case 'refund-initiated':
      // "Retailer says refund issued" is not "refund received": the case stays pending.
      return refundCase.status === 'partial-refund' ? null : 'refund-pending';
    default:
      return null;
  }
}

export function addTimelineEvent(input: NewEventInput) {
  const refundCase = getCase(input.caseId);
  if (!refundCase) throw new Error('Case not found');
  db.transaction((tx) => {
    insertEvent(tx, input);
    const nextStatus = statusAfterEvent(refundCase, input.type);
    if (nextStatus && nextStatus !== refundCase.status) {
      setCaseStatus(tx, input.caseId, nextStatus);
    } else {
      touchCase(tx, input.caseId);
    }
  });
}

export function updateTimelineEvent(
  id: string,
  changes: Pick<NewEventInput, 'occurredAt' | 'source' | 'description'>,
) {
  db.update(timelineEvents)
    .set({ ...changes, editedAt: Date.now() })
    .where(eq(timelineEvents.id, id))
    .run();
}

export function deleteTimelineEvent(id: string) {
  db.delete(timelineEvents).where(eq(timelineEvents.id, id)).run();
}

export function selectEventsForCase(caseId: string) {
  return db.select().from(timelineEvents).where(eq(timelineEvents.caseId, caseId));
}

export function getEvent(id: string) {
  return db.select().from(timelineEvents).where(eq(timelineEvents.id, id)).get();
}
