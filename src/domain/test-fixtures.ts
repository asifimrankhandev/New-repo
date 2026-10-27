import type { RefundCase, RefundEntry, TimelineEvent } from './models';

/** Builders for unit tests. Not imported by app code. */

export function makeCase(overrides: Partial<RefundCase> = {}): RefundCase {
  return {
    id: 'case-1',
    title: 'Trail shell jacket',
    retailerName: 'Northpeak Outdoor',
    itemName: 'Trail shell jacket',
    orderReference: 'NP-20931',
    purchaseDate: '2026-09-28',
    purchaseAmountCents: 14800,
    currencyCode: 'USD',
    expectedRefundCents: 14800,
    expectedRefundDate: '2026-10-20',
    expectedRefundSource: 'retailer-message',
    expectedRefundSourceNote: null,
    paymentType: 'credit-card',
    returnMethod: 'carrier-drop-off',
    returnInitiatedDate: null,
    handoffDate: '2026-10-09',
    carrierName: 'UPS',
    trackingReference: '1Z84A0F2034471920',
    notes: null,
    status: 'refund-pending',
    dismissedNextStep: null,
    isSample: false,
    createdAt: 0,
    updatedAt: 0,
    archivedAt: null,
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    caseId: 'case-1',
    type: 'note',
    occurredAt: new Date(2026, 9, 12, 10).getTime(),
    source: 'user',
    description: null,
    amountCents: null,
    createdAt: 0,
    editedAt: null,
    ...overrides,
  };
}

export function makeEntry(overrides: Partial<RefundEntry> = {}): RefundEntry {
  return {
    id: 'entry-1',
    caseId: 'case-1',
    kind: 'cash',
    amountCents: 0,
    receivedDate: '2026-10-27',
    confirmationSource: 'statement-checked',
    note: null,
    createdAt: 0,
    ...overrides,
  };
}
