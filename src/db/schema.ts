import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import {
  caseStatus,
  confirmationSource,
  dateSource,
  eventSource,
  eventType,
  evidenceType,
  paymentType,
  refundKind,
  reminderType,
  returnMethod,
} from '@/domain/enums';

/**
 * Local-first schema. Money is integer cents, calendar dates are "YYYY-MM-DD" text and
 * moments are epoch milliseconds. Change it only together with `npm run db:generate`.
 */

export const cases = sqliteTable(
  'cases',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    retailerName: text('retailer_name').notNull(),
    itemName: text('item_name').notNull(),
    orderReference: text('order_reference'),
    purchaseDate: text('purchase_date'),
    purchaseAmountCents: integer('purchase_amount_cents').notNull(),
    currencyCode: text('currency_code').notNull().default('USD'),
    expectedRefundCents: integer('expected_refund_cents'),
    expectedRefundDate: text('expected_refund_date'),
    expectedRefundSource: text('expected_refund_source', { enum: dateSource.values }),
    expectedRefundSourceNote: text('expected_refund_source_note'),
    paymentType: text('payment_type', { enum: paymentType.values }),
    returnMethod: text('return_method', { enum: returnMethod.values }),
    returnInitiatedDate: text('return_initiated_date'),
    handoffDate: text('handoff_date'),
    carrierName: text('carrier_name'),
    trackingReference: text('tracking_reference'),
    notes: text('notes'),
    status: text('status', { enum: caseStatus.values }).notNull(),
    dismissedNextStep: text('dismissed_next_step'),
    isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    archivedAt: integer('archived_at'),
  },
  (table) => [
    index('cases_archived_at_idx').on(table.archivedAt),
    index('cases_updated_at_idx').on(table.updatedAt),
  ],
);

export const timelineEvents = sqliteTable(
  'timeline_events',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    type: text('type', { enum: eventType.values }).notNull(),
    occurredAt: integer('occurred_at').notNull(),
    source: text('source', { enum: eventSource.values }).notNull(),
    description: text('description'),
    amountCents: integer('amount_cents'),
    createdAt: integer('created_at').notNull(),
    editedAt: integer('edited_at'),
  },
  (table) => [index('timeline_events_case_id_idx').on(table.caseId, table.occurredAt)],
);

export const evidence = sqliteTable(
  'evidence',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    storedFileName: text('stored_file_name').notNull(),
    originalFileName: text('original_file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    evidenceType: text('evidence_type', { enum: evidenceType.values }).notNull(),
    evidenceDate: text('evidence_date'),
    note: text('note'),
    includeInExport: integer('include_in_export', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('evidence_case_id_idx').on(table.caseId)],
);

export const refundEntries = sqliteTable(
  'refund_entries',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: refundKind.values }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    receivedDate: text('received_date').notNull(),
    confirmationSource: text('confirmation_source', { enum: confirmationSource.values }).notNull(),
    note: text('note'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('refund_entries_case_id_idx').on(table.caseId)],
);

export const reminders = sqliteTable(
  'reminders',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    type: text('type', { enum: reminderType.values }).notNull(),
    scheduledAt: integer('scheduled_at').notNull(),
    completedAt: integer('completed_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('reminders_scheduled_at_idx').on(table.scheduledAt)],
);

export const preferences = sqliteTable('preferences', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
