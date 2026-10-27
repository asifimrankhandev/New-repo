import { formatCents } from './money';
import { formatShortDate, fromIsoDate, type IsoDate, todayIso } from './dates';
import { dateSource, isResolvedStatus } from './enums';
import type { RefundCase, RefundEntry, TimelineEvent } from './models';
import { reconcile } from './reconciliation';
import { OFFICIAL_SOURCES, type OfficialSource } from './official-sources';

export type NextStepAction =
  | 'record-handoff'
  | 'check-tracking'
  | 'add-expected-date'
  | 'wait'
  | 'contact-retailer'
  | 'ask-remaining'
  | 'check-payment-method'
  | 'review-options'
  | 'none';

export interface NextStep {
  /** Stable for the current facts; changes when the facts change so dismissals expire. */
  key: string;
  action: NextStepAction;
  title: string;
  body: string;
  /** The recorded facts the suggestion is based on. */
  reasons: string[];
  officialSource?: OfficialSource;
}

interface NextStepInput {
  refundCase: RefundCase;
  events: readonly TimelineEvent[];
  entries: readonly RefundEntry[];
  today?: IsoDate;
}

/**
 * Deterministic next-step rules. No universal deadlines and no legal conclusions: every
 * suggestion is derived from facts the user recorded and says which ones it used.
 */
export function getNextStep(input: NextStepInput): NextStep {
  const step = computeNextStep(input);
  if (input.refundCase.dismissedNextStep === step.key) {
    return {
      key: 'dismissed',
      action: 'none',
      title: 'Choose your own next step',
      body: 'You said the suggestion didn’t fit. Add an event or update the case and RefundBeacon will suggest again.',
      reasons: [],
    };
  }
  return step;
}

function computeNextStep({
  refundCase,
  events,
  entries,
  today = todayIso(),
}: NextStepInput): NextStep {
  const { status } = refundCase;
  const money = reconcile(refundCase, entries);
  const fmt = (cents: number) => formatCents(cents, refundCase.currencyCode);

  if (isResolvedStatus(status)) {
    return {
      key: 'resolved',
      action: 'none',
      title: 'Case resolved',
      body: 'Reminders are off for this case. Reopen it if anything changes.',
      reasons: [],
    };
  }

  if (status === 'rejected') {
    return {
      key: 'rejected',
      action: 'review-options',
      title: 'Review your options',
      body: 'If you believe there’s a billing error, ask your card issuer about its dispute process and any deadlines that apply to you.',
      reasons: ['Retailer rejection recorded'],
      officialSource: OFFICIAL_SOURCES.cfpbDispute,
    };
  }

  if (!refundCase.handoffDate && (status === 'draft' || status === 'return-planned')) {
    return {
      key: 'record-handoff',
      action: 'record-handoff',
      title: 'Record the return when you hand it over',
      body: 'Add the drop-off date and keep the receipt — it anchors every later step.',
      reasons: ['No hand-over date recorded yet'],
    };
  }

  if (status === 'return-in-transit') {
    const reasons = [`Handed over ${formatShortDate(refundCase.handoffDate ?? today)}`];
    if (refundCase.trackingReference) reasons.push('Tracking number recorded');
    return {
      key: 'check-tracking',
      action: 'check-tracking',
      title: 'Check the tracking status',
      body: 'No refund conclusion can be drawn until the return arrives. Log the delivery when the carrier confirms it.',
      reasons,
    };
  }

  if (status === 'partial-refund' && money.remainingCents !== null && money.remainingCents > 0) {
    return {
      key: `ask-remaining:${money.cashReceivedCents}`,
      action: 'ask-remaining',
      title: 'Ask about the remaining balance',
      body: 'Ask the retailer to explain the difference or confirm when the rest will be refunded.',
      reasons: [
        `${fmt(money.cashReceivedCents)} received of ${fmt(money.expectedCents ?? 0)} expected`,
        'Both amounts entered by you',
      ],
    };
  }

  const expectedDate = refundCase.expectedRefundDate;
  if (!expectedDate) {
    return {
      key: 'add-expected-date',
      action: 'add-expected-date',
      title: 'Add the retailer’s refund timeframe',
      body: 'Check the retailer’s stated refund process and add the expected date if one is available.',
      reasons: ['No expected refund date recorded'],
    };
  }

  const sourceLabel = refundCase.expectedRefundSource
    ? dateSource.labels[refundCase.expectedRefundSource].toLowerCase()
    : 'not recorded';
  const dateReason = `Expected refund date ${formatShortDate(expectedDate)} — source: ${sourceLabel}`;

  if (expectedDate >= today) {
    return {
      key: `wait:${expectedDate}`,
      action: 'wait',
      title: `Wait until ${formatShortDate(expectedDate)}`,
      body: 'You can still contact the retailer sooner if its policy or your circumstances call for it.',
      reasons: [dateReason],
    };
  }

  const expectedStart = fromIsoDate(expectedDate).getTime();
  const contactedSince = events.some(
    (event) => event.type === 'retailer-contacted' && event.occurredAt >= expectedStart,
  );
  const deliveredEvent = events.find((event) => event.type === 'delivered');
  const reasons = [dateReason, 'No refund recorded since then'];
  if (deliveredEvent) {
    reasons.push(`Return delivered ${formatShortDate(new Date(deliveredEvent.occurredAt))}`);
  }

  if (contactedSince) {
    return {
      key: `check-payment-method:${expectedDate}`,
      action: 'check-payment-method',
      title: 'Check your original payment method',
      body: 'Refunds can take a few days to post. If it still hasn’t arrived, follow up again or ask your card issuer about its process.',
      reasons: [...reasons, 'You already contacted the retailer'],
      officialSource: OFFICIAL_SOURCES.cfpbRefund,
    };
  }

  return {
    key: `contact-retailer:${expectedDate}`,
    action: 'contact-retailer',
    title: 'Contact the retailer',
    body: 'Review your evidence first, then ask for the refund status and a completion date.',
    reasons,
  };
}
