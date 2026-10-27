/**
 * Controlled vocabularies stored in the database. Values are stable identifiers — never
 * rename one without a migration. Labels are presentation-only.
 */

function labelled<const T extends string>(labels: Record<T, string>) {
  const values = Object.keys(labels) as T[];
  return { values: values as [T, ...T[]], labels };
}

export const caseStatus = labelled({
  draft: 'Draft',
  'return-planned': 'Return planned',
  'return-in-transit': 'Return in transit',
  delivered: 'Return received',
  'refund-pending': 'Refund pending',
  'partial-refund': 'Partial refund',
  refunded: 'Refund received',
  'store-credit': 'Store credit / exchange',
  rejected: 'Rejected / disputed',
  closed: 'Closed without recovery',
});
export type CaseStatus = (typeof caseStatus.values)[number];

/** Statuses that mean the user recorded a final outcome. */
export const RESOLVED_STATUSES: readonly CaseStatus[] = ['refunded', 'store-credit', 'closed'];
/** Rejected cases stay visible as active: the user may still be disputing them. */
export const isResolvedStatus = (status: CaseStatus) => RESOLVED_STATUSES.includes(status);

export const paymentType = labelled({
  'credit-card': 'Credit card',
  'debit-card': 'Debit card',
  'digital-wallet': 'PayPal / wallet',
  'gift-card': 'Gift card / store credit',
  cash: 'Cash',
  other: 'Other',
});
export type PaymentType = (typeof paymentType.values)[number];

export const returnMethod = labelled({
  'in-store': 'In store',
  'carrier-drop-off': 'Carrier drop-off',
  'retailer-drop-off': 'Retailer drop-off point',
  pickup: 'Pickup',
  cancellation: 'Cancellation / digital',
  other: 'Other',
});
export type ReturnMethod = (typeof returnMethod.values)[number];

export const dateSource = labelled({
  'retailer-message': 'Retailer message',
  'retailer-policy': 'Retailer policy',
  'carrier-status': 'Carrier status',
  'user-estimate': 'My estimate',
  other: 'Other',
});
export type DateSource = (typeof dateSource.values)[number];

export const dateSourceHints: Record<DateSource, string> = {
  'retailer-message': 'Email, chat or receipt',
  'retailer-policy': 'Published return terms',
  'carrier-status': 'Tracking page',
  'user-estimate': 'Marked as estimated',
  other: 'Something else',
};

export const eventType = labelled({
  'purchase-recorded': 'Purchase recorded',
  'return-requested': 'Return requested',
  'return-label-created': 'Return label created',
  'item-dropped-off': 'Item handed over',
  'carrier-scan': 'Carrier scan',
  delivered: 'Return delivered',
  'retailer-contacted': 'Contacted retailer',
  'retailer-replied': 'Retailer replied',
  'refund-approved': 'Refund approved',
  'refund-initiated': 'Refund initiated',
  'partial-refund-received': 'Partial refund received',
  'full-refund-received': 'Full refund received',
  'store-credit-issued': 'Store credit issued',
  'exchange-issued': 'Exchange issued',
  'refund-rejected': 'Refund rejected',
  'case-closed': 'Case closed',
  'case-reopened': 'Case reopened',
  'case-exported': 'Summary exported',
  note: 'Note',
});
export type EventType = (typeof eventType.values)[number];

/** Event types a user can add manually from the timeline sheet. */
export const MANUAL_EVENT_TYPES: readonly EventType[] = [
  'retailer-contacted',
  'retailer-replied',
  'return-requested',
  'return-label-created',
  'item-dropped-off',
  'carrier-scan',
  'delivered',
  'refund-approved',
  'refund-initiated',
  'note',
];

export const eventSource = labelled({
  user: 'You',
  retailer: 'Retailer-reported',
  carrier: 'Carrier-reported',
  system: 'RefundBeacon',
});
export type EventSource = (typeof eventSource.values)[number];

export const evidenceType = labelled({
  'purchase-receipt': 'Purchase receipt',
  'return-authorization': 'Return authorization',
  'return-label': 'Return label',
  'drop-off-receipt': 'Drop-off receipt',
  tracking: 'Tracking screenshot',
  'delivery-confirmation': 'Delivery confirmation',
  'retailer-message': 'Retailer message',
  'refund-confirmation': 'Refund confirmation',
  'statement-excerpt': 'Statement excerpt',
  other: 'Other',
});
export type EvidenceType = (typeof evidenceType.values)[number];

export const refundKind = labelled({
  cash: 'Refund to payment method',
  'store-credit': 'Store credit',
  exchange: 'Exchange',
});
export type RefundKind = (typeof refundKind.values)[number];

export const confirmationSource = labelled({
  'statement-checked': 'Checked my statement',
  'retailer-email': 'Retailer email',
  other: 'Other',
});
export type ConfirmationSource = (typeof confirmationSource.values)[number];

export const outcomeType = labelled({
  'full-refund': 'Full refund',
  'partial-refund': 'Partial refund',
  'store-credit': 'Store credit',
  exchange: 'Exchange',
  rejected: 'Rejected',
  closed: 'Close case',
});
export type OutcomeType = (typeof outcomeType.values)[number];

export const reminderType = labelled({
  'follow-up': 'Follow up with the retailer',
  'check-refund': 'Check whether the refund arrived',
  'add-evidence': 'Add missing evidence',
});
export type ReminderType = (typeof reminderType.values)[number];

export const reminderShortLabels: Record<ReminderType, string> = {
  'follow-up': 'Follow up',
  'check-refund': 'Check refund',
  'add-evidence': 'Add evidence',
};

export const appearance = labelled({ system: 'System', light: 'Light', dark: 'Dark' });
export type Appearance = (typeof appearance.values)[number];
