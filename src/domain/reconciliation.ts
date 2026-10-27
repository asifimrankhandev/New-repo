import type { RefundCase, RefundEntry } from './models';

export interface Reconciliation {
  expectedCents: number | null;
  cashReceivedCents: number;
  storeCreditCents: number;
  exchangeCents: number;
  /** Arithmetic balance only — null when no expected amount was entered. */
  remainingCents: number | null;
  /** Cash received beyond the expected amount, shown rather than silently clamped. */
  overageCents: number;
}

/**
 * Sums user-entered refund entries. Store credit and exchanges are tracked separately and never
 * counted as cash; the remaining figure is arithmetic, not a statement that money is owed.
 */
export function reconcile(
  refundCase: Pick<RefundCase, 'expectedRefundCents'>,
  entries: readonly Pick<RefundEntry, 'kind' | 'amountCents'>[],
): Reconciliation {
  let cashReceivedCents = 0;
  let storeCreditCents = 0;
  let exchangeCents = 0;
  for (const entry of entries) {
    if (entry.kind === 'cash') cashReceivedCents += entry.amountCents;
    else if (entry.kind === 'store-credit') storeCreditCents += entry.amountCents;
    else exchangeCents += entry.amountCents;
  }
  const expectedCents = refundCase.expectedRefundCents;
  const remainingCents =
    expectedCents === null ? null : Math.max(expectedCents - cashReceivedCents, 0);
  const overageCents = expectedCents === null ? 0 : Math.max(cashReceivedCents - expectedCents, 0);
  return {
    expectedCents,
    cashReceivedCents,
    storeCreditCents,
    exchangeCents,
    remainingCents,
    overageCents,
  };
}
