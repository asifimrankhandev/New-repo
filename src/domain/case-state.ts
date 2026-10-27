import { type IsoDate, todayIso } from './dates';
import { caseStatus, type CaseStatus, isResolvedStatus } from './enums';
import type { RefundCase, RefundEntry } from './models';
import { reconcile } from './reconciliation';

export interface CaseDisplayState {
  /** The recorded refund date has passed and the expected amount isn't confirmed. */
  followUpDue: boolean;
  label: string;
  tone: 'accent' | 'neutral' | 'resolved';
}

export function isFollowUpDue(
  refundCase: RefundCase,
  entries: readonly RefundEntry[],
  today: IsoDate = todayIso(),
): boolean {
  if (isResolvedStatus(refundCase.status) || refundCase.status === 'rejected') return false;
  if (!refundCase.expectedRefundDate || refundCase.expectedRefundDate >= today) return false;
  const { remainingCents, cashReceivedCents } = reconcile(refundCase, entries);
  return remainingCents === null ? cashReceivedCents === 0 : remainingCents > 0;
}

export function getDisplayState(
  refundCase: RefundCase,
  entries: readonly RefundEntry[],
  today: IsoDate = todayIso(),
): CaseDisplayState {
  if (isFollowUpDue(refundCase, entries, today)) {
    return { followUpDue: true, label: 'Follow-up due', tone: 'accent' };
  }
  return {
    followUpDue: false,
    label: caseStatus.labels[refundCase.status],
    tone: isResolvedStatus(refundCase.status) ? 'resolved' : 'neutral',
  };
}

/** Progress through the four refund stages shown on case cards. */
export function getProgressStage(status: CaseStatus): 0 | 1 | 2 | 3 | 4 {
  switch (status) {
    case 'draft':
    case 'return-planned':
      return 0;
    case 'return-in-transit':
      return 1;
    case 'delivered':
    case 'refund-pending':
    case 'rejected':
      return 2;
    case 'partial-refund':
      return 3;
    case 'refunded':
    case 'store-credit':
    case 'closed':
      return 4;
  }
}

/** Status once the item is handed over: in-store returns skip the transit stage. */
export function statusAfterHandOff(returnMethod: RefundCase['returnMethod']): CaseStatus {
  return returnMethod === 'in-store' || returnMethod === 'cancellation'
    ? 'refund-pending'
    : 'return-in-transit';
}

/** Status a new case starts in, inferred only from facts the user entered. */
export function inferInitialStatus(
  input: Pick<RefundCase, 'handoffDate' | 'returnMethod'>,
): CaseStatus {
  return input.handoffDate ? statusAfterHandOff(input.returnMethod) : 'return-planned';
}
