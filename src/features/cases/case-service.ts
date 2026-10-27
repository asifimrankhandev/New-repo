import { addDaysIso, todayIso } from '@/domain/dates';
import { getEvidenceForCase } from '@/features/evidence/evidence-repository';
import { deleteEvidenceFile } from '@/features/evidence/evidence-storage';
import { cancelNotifications } from '@/features/reminders/reminder-repository';
import { addTimelineEvent } from '@/features/timeline/timeline-repository';

import {
  createCase,
  deleteCaseRecords,
  middayOf,
  selectPendingRemindersForCase,
  setArchived,
} from './case-repository';

/** Deletes a case, its records (cascade), its evidence files and its notifications. */
export async function deleteCase(caseId: string) {
  const files = getEvidenceForCase(caseId).map((row) => row.storedFileName);
  const reminderIds = selectPendingRemindersForCase(caseId).map((row) => row.id);
  deleteCaseRecords(caseId);
  files.forEach(deleteEvidenceFile);
  await cancelNotifications(reminderIds);
}

/** Archiving hides a case and silences its reminders; nothing is deleted. */
export async function archiveCase(caseId: string) {
  const reminderIds = selectPendingRemindersForCase(caseId).map((row) => row.id);
  setArchived(caseId, true);
  await cancelNotifications(reminderIds);
}

/** A realistic, clearly labelled case to explore without entering personal data. */
export function createSampleCase(): string {
  const today = todayIso();
  const handoffDate = addDaysIso(today, -18);
  const id = createCase(
    {
      retailerName: 'Sample Outfitters',
      itemName: 'Sample: trail shell jacket',
      purchaseAmountCents: 14800,
      purchaseDate: addDaysIso(today, -29),
      orderReference: 'SAMPLE-20931',
      paymentType: 'credit-card',
      returnMethod: 'carrier-drop-off',
      handoffDate,
      carrierName: 'UPS',
      trackingReference: '1Z SAMPLE 0000',
      expectedRefundCents: 14800,
      expectedRefundDate: addDaysIso(today, -7),
      expectedRefundSource: 'retailer-message',
      expectedRefundSourceNote: null,
      notes: 'This is a sample case. Delete it any time from the case menu.',
    },
    { isSample: true },
  );
  addTimelineEvent({
    caseId: id,
    type: 'delivered',
    source: 'carrier',
    occurredAt: middayOf(addDaysIso(today, -15), Date.now()),
    description: 'Delivered to the retailer’s returns center',
  });
  addTimelineEvent({
    caseId: id,
    type: 'retailer-replied',
    source: 'retailer',
    occurredAt: middayOf(addDaysIso(today, -13), Date.now()),
    description: '“Your refund will post within 5–7 business days.”',
  });
  return id;
}
