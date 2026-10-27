import { formatLongDate, formatShortDate } from './dates';
import {
  caseStatus,
  dateSource,
  eventSource,
  eventType,
  evidenceType,
  paymentType,
  refundKind,
  returnMethod,
} from './enums';
import type { EvidenceAttachment, RefundCase, RefundEntry, TimelineEvent } from './models';
import { formatCents } from './money';
import { reconcile } from './reconciliation';

export const SUMMARY_DISCLAIMER =
  'This summary contains information entered or selected by the user. It is not a legal determination or proof that a refund is owed.';

export interface SummaryOptions {
  includeTimeline: boolean;
  includeOrderReference: boolean;
  includeNotes: boolean;
}

export interface SummaryInput {
  refundCase: RefundCase;
  events: readonly TimelineEvent[];
  entries: readonly RefundEntry[];
  /** Only the evidence the user chose to include. */
  evidence: readonly EvidenceAttachment[];
  options: SummaryOptions;
  generatedAt: Date;
}

const RULE = '────────────────────────────';

function row(label: string, value: string, width = 30): string {
  const padding = Math.max(width - label.length - value.length, 1);
  return `${label}${' '.repeat(padding)}${value}`;
}

function byTime(a: TimelineEvent, b: TimelineEvent) {
  return a.occurredAt - b.occurredAt;
}

export function buildTextSummary(input: SummaryInput): string {
  const { refundCase: c, events, entries, evidence, options, generatedAt } = input;
  const fmt = (cents: number) => formatCents(cents, c.currencyCode);
  const money = reconcile(c, entries);
  const lines: string[] = [];

  lines.push('REFUND CASE SUMMARY');
  lines.push(`${c.itemName} — ${c.retailerName}`);
  const reference =
    options.includeOrderReference && c.orderReference ? `Order ${c.orderReference} · ` : '';
  lines.push(`${reference}Case ${c.id.slice(0, 8)} · Generated ${formatLongDate(generatedAt)}`);
  lines.push(RULE);
  lines.push(row('Purchase amount', fmt(c.purchaseAmountCents)));
  lines.push(
    row('Expected refund', money.expectedCents === null ? 'Not entered' : fmt(money.expectedCents)),
  );
  lines.push(row('Cash received', fmt(money.cashReceivedCents)));
  if (money.storeCreditCents > 0) lines.push(row('Store credit', fmt(money.storeCreditCents)));
  if (money.exchangeCents > 0) lines.push(row('Exchange value', fmt(money.exchangeCents)));
  if (money.remainingCents !== null)
    lines.push(row('Not yet confirmed', fmt(money.remainingCents)));
  lines.push(row('Status', caseStatus.labels[c.status]));
  lines.push(RULE);

  lines.push('DATES');
  if (c.purchaseDate) lines.push(`Purchased      ${formatLongDate(c.purchaseDate)}`);
  if (c.handoffDate) {
    const method = c.returnMethod ? ` (${returnMethod.labels[c.returnMethod]})` : '';
    lines.push(`Returned       ${formatLongDate(c.handoffDate)}${method}`);
  }
  if (c.expectedRefundDate) {
    const source = c.expectedRefundSource
      ? ` — source: ${dateSource.labels[c.expectedRefundSource]}`
      : '';
    lines.push(`Refund by      ${formatLongDate(c.expectedRefundDate)}${source}`);
  }
  if (c.paymentType) lines.push(`Paid with      ${paymentType.labels[c.paymentType]}`);
  if (c.carrierName || c.trackingReference) {
    lines.push(
      `Carrier        ${[c.carrierName, c.trackingReference].filter(Boolean).join(' · ')}`,
    );
  }

  if (options.includeTimeline && events.length > 0) {
    lines.push(RULE);
    lines.push('TIMELINE');
    for (const event of [...events].sort(byTime)) {
      const amount = event.amountCents === null ? '' : ` · ${fmt(event.amountCents)}`;
      const detail = event.description ? ` — ${event.description}` : '';
      lines.push(
        `${formatShortDate(new Date(event.occurredAt)).padEnd(7)} ${eventType.labels[event.type]} (${eventSource.labels[event.source].toLowerCase()})${amount}${detail}`,
      );
    }
  }

  if (entries.length > 0) {
    lines.push(RULE);
    lines.push('REFUNDS RECORDED');
    for (const entry of entries) {
      lines.push(
        `${formatShortDate(entry.receivedDate).padEnd(7)} ${refundKind.labels[entry.kind]} · ${fmt(entry.amountCents)}`,
      );
    }
  }

  lines.push(RULE);
  lines.push(`EVIDENCE (${evidence.length} included)`);
  for (const item of evidence) {
    const date = item.evidenceDate ? ` · ${formatShortDate(item.evidenceDate)}` : '';
    const note = item.note ? ` — ${item.note}` : '';
    lines.push(
      `• ${evidenceType.labels[item.evidenceType]}: ${item.originalFileName}${date}${note}`,
    );
  }

  if (options.includeNotes && c.notes) {
    lines.push(RULE);
    lines.push('NOTES');
    lines.push(c.notes);
  }

  lines.push(RULE);
  lines.push(SUMMARY_DISCLAIMER);
  return lines.join('\n');
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: readonly (readonly (string | number | null)[])[]): string {
  return rows.map((cells) => cells.map(csvCell).join(',')).join('\n');
}

/** One row per timeline event, for spreadsheets. Amounts are plain decimals. */
export function buildTimelineCsv(input: SummaryInput): string {
  const { refundCase: c, events, options } = input;
  const header = ['date', 'event', 'reported_by', 'amount', 'note'];
  const rows = [...events]
    .sort(byTime)
    .map((event) => [
      new Date(event.occurredAt).toISOString(),
      eventType.labels[event.type],
      eventSource.labels[event.source],
      event.amountCents === null ? null : (event.amountCents / 100).toFixed(2),
      event.description,
    ]);
  const meta = [
    ['case', c.itemName],
    ['retailer', c.retailerName],
    ['order', options.includeOrderReference ? c.orderReference : null],
    [],
  ];
  return toCsv([...meta, header, ...rows]);
}

/** One row per case — used by "Export all data". */
export function buildCasesCsv(
  cases: readonly RefundCase[],
  entriesByCase: ReadonlyMap<string, readonly RefundEntry[]>,
): string {
  const header = [
    'id',
    'retailer',
    'item',
    'order_reference',
    'status',
    'purchase_amount',
    'expected_refund',
    'cash_received',
    'store_credit',
    'purchase_date',
    'returned_date',
    'expected_refund_date',
    'expected_date_source',
    'archived',
  ];
  const rows = cases.map((c) => {
    const money = reconcile(c, entriesByCase.get(c.id) ?? []);
    return [
      c.id,
      c.retailerName,
      c.itemName,
      c.orderReference,
      c.status,
      (c.purchaseAmountCents / 100).toFixed(2),
      money.expectedCents === null ? null : (money.expectedCents / 100).toFixed(2),
      (money.cashReceivedCents / 100).toFixed(2),
      (money.storeCreditCents / 100).toFixed(2),
      c.purchaseDate,
      c.handoffDate,
      c.expectedRefundDate,
      c.expectedRefundSource,
      c.archivedAt === null ? 'no' : 'yes',
    ];
  });
  return toCsv([header, ...rows]);
}
