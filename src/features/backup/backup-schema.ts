import { z } from 'zod';

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

/** Bump when the backup format changes; restore rejects versions it doesn't understand. */
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_APP_ID = 'refund-beacon';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableIsoDate = isoDate.nullable();
const timestamp = z.number().int().nonnegative();
const cents = z.number().int().nonnegative();

const caseRecord = z.object({
  id: z.string().min(1),
  title: z.string(),
  retailerName: z.string().min(1),
  itemName: z.string().min(1),
  orderReference: z.string().nullable(),
  purchaseDate: nullableIsoDate,
  purchaseAmountCents: cents,
  currencyCode: z.string().length(3),
  expectedRefundCents: cents.nullable(),
  expectedRefundDate: nullableIsoDate,
  expectedRefundSource: z.enum(dateSource.values).nullable(),
  expectedRefundSourceNote: z.string().nullable(),
  paymentType: z.enum(paymentType.values).nullable(),
  returnMethod: z.enum(returnMethod.values).nullable(),
  returnInitiatedDate: nullableIsoDate,
  handoffDate: nullableIsoDate,
  carrierName: z.string().nullable(),
  trackingReference: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(caseStatus.values),
  dismissedNextStep: z.string().nullable(),
  isSample: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: timestamp.nullable(),
});

const eventRecord = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  type: z.enum(eventType.values),
  occurredAt: timestamp,
  source: z.enum(eventSource.values),
  description: z.string().nullable(),
  amountCents: cents.nullable(),
  createdAt: timestamp,
  editedAt: timestamp.nullable(),
});

const evidenceRecord = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  storedFileName: z.string().regex(/^[a-zA-Z0-9-]+\.[a-z]+$/),
  originalFileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  evidenceType: z.enum(evidenceType.values),
  evidenceDate: nullableIsoDate,
  note: z.string().nullable(),
  includeInExport: z.boolean(),
  createdAt: timestamp,
  /** File contents; null when the file was missing at backup time. */
  contentBase64: z.string().nullable(),
});

const refundEntryRecord = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  kind: z.enum(refundKind.values),
  amountCents: cents,
  receivedDate: isoDate,
  confirmationSource: z.enum(confirmationSource.values),
  note: z.string().nullable(),
  createdAt: timestamp,
});

const reminderRecord = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  type: z.enum(reminderType.values),
  scheduledAt: timestamp,
  completedAt: timestamp.nullable(),
  createdAt: timestamp,
});

export const backupSchema = z
  .object({
    app: z.literal(BACKUP_APP_ID),
    formatVersion: z.literal(BACKUP_FORMAT_VERSION),
    exportedAt: z.string(),
    data: z.object({
      cases: z.array(caseRecord),
      timelineEvents: z.array(eventRecord),
      evidence: z.array(evidenceRecord),
      refundEntries: z.array(refundEntryRecord),
      reminders: z.array(reminderRecord),
      preferences: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  })
  .superRefine((backup, ctx) => {
    // Every child record must point at a case in the same backup.
    const caseIds = new Set(backup.data.cases.map((item) => item.id));
    const children = [
      ...backup.data.timelineEvents,
      ...backup.data.evidence,
      ...backup.data.refundEntries,
      ...backup.data.reminders,
    ];
    if (children.some((item) => !caseIds.has(item.caseId))) {
      ctx.addIssue({ code: 'custom', message: 'The backup references cases it doesn’t contain.' });
    }
  });

export type Backup = z.infer<typeof backupSchema>;
