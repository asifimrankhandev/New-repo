import type { IsoDate } from './dates';
import type {
  CaseStatus,
  ConfirmationSource,
  DateSource,
  EventSource,
  EventType,
  EvidenceType,
  PaymentType,
  RefundKind,
  ReminderType,
  ReturnMethod,
} from './enums';

/** Plain domain records. The database layer maps rows to these shapes. */

export interface RefundCase {
  id: string;
  title: string;
  retailerName: string;
  itemName: string;
  orderReference: string | null;
  purchaseDate: IsoDate | null;
  purchaseAmountCents: number;
  currencyCode: string;
  expectedRefundCents: number | null;
  expectedRefundDate: IsoDate | null;
  expectedRefundSource: DateSource | null;
  expectedRefundSourceNote: string | null;
  paymentType: PaymentType | null;
  returnMethod: ReturnMethod | null;
  returnInitiatedDate: IsoDate | null;
  handoffDate: IsoDate | null;
  carrierName: string | null;
  trackingReference: string | null;
  notes: string | null;
  status: CaseStatus;
  dismissedNextStep: string | null;
  isSample: boolean;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: EventType;
  occurredAt: number;
  source: EventSource;
  description: string | null;
  amountCents: number | null;
  createdAt: number;
  editedAt: number | null;
}

export interface EvidenceAttachment {
  id: string;
  caseId: string;
  storedFileName: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  evidenceType: EvidenceType;
  evidenceDate: IsoDate | null;
  note: string | null;
  includeInExport: boolean;
  createdAt: number;
}

export interface RefundEntry {
  id: string;
  caseId: string;
  kind: RefundKind;
  amountCents: number;
  receivedDate: IsoDate;
  confirmationSource: ConfirmationSource;
  note: string | null;
  createdAt: number;
}

export interface Reminder {
  id: string;
  caseId: string;
  type: ReminderType;
  scheduledAt: number;
  completedAt: number | null;
  createdAt: number;
}
