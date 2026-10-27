import { formatShortDate } from './dates';
import { type DateSource, returnMethod } from './enums';
import type { RefundCase, RefundEntry, TimelineEvent } from './models';
import { formatCents } from './money';
import { reconcile } from './reconciliation';

export type FollowUpTone = 'polite' | 'concise' | 'firm';
export type FollowUpRequest = 'status' | 'remaining';

export interface MessageSegment {
  text: string;
  /** `fact` comes from the case; `missing` is a placeholder the user must fill in or remove. */
  kind: 'plain' | 'fact' | 'missing';
}

export interface FollowUpDraft {
  subject: string;
  segments: MessageSegment[];
  body: string;
  missing: string[];
}

interface DraftInput {
  refundCase: RefundCase;
  events: readonly TimelineEvent[];
  entries: readonly RefundEntry[];
  evidenceCount: number;
  tone: FollowUpTone;
  request: FollowUpRequest;
}

/** How each expected-date source is cited to the retailer; estimates are never cited. */
const SOURCE_PHRASES: Record<DateSource, string | null> = {
  'retailer-message': 'as stated in your message',
  'retailer-policy': 'per your return policy',
  'carrier-status': null,
  'user-estimate': null,
  other: null,
};

class SegmentBuilder {
  readonly segments: MessageSegment[] = [];
  readonly missing: string[] = [];

  plain(text: string) {
    this.segments.push({ text, kind: 'plain' });
    return this;
  }

  fact(value: string | null | undefined, placeholder: string) {
    if (value) {
      this.segments.push({ text: value, kind: 'fact' });
    } else {
      this.segments.push({ text: `[${placeholder}]`, kind: 'missing' });
      this.missing.push(placeholder);
    }
    return this;
  }
}

/**
 * Builds a follow-up message from recorded facts only. Unknown facts become visible
 * placeholders, and the copy avoids threats, legal claims and invented deadlines.
 */
export function buildFollowUpDraft(input: DraftInput): FollowUpDraft {
  const { refundCase, events, entries, evidenceCount, tone, request } = input;
  const money = reconcile(refundCase, entries);
  const fmt = (cents: number) => formatCents(cents, refundCase.currencyCode);
  const delivered = events.find((event) => event.type === 'delivered');
  const builder = new SegmentBuilder();

  builder.plain(tone === 'concise' ? 'Hi,\n\n' : 'Hello,\n\n');

  builder
    .plain('I’m following up on order ')
    .fact(refundCase.orderReference, 'order number')
    .plain(' for the ')
    .fact(refundCase.itemName, 'item')
    .plain('. ');

  if (refundCase.handoffDate) {
    builder.plain('I returned it on ').fact(formatShortDate(refundCase.handoffDate), 'return date');
    const via =
      refundCase.carrierName ??
      (refundCase.returnMethod ? returnMethod.labels[refundCase.returnMethod].toLowerCase() : null);
    if (via) builder.plain(' via ').fact(via, 'return method');
  } else {
    builder.plain('I returned it on ').fact(null, 'return date');
  }
  if (delivered) {
    builder
      .plain(', and tracking shows it was delivered on ')
      .fact(formatShortDate(new Date(delivered.occurredAt)), 'delivery date')
      .plain('.\n\n');
  } else {
    builder.plain('.\n\n');
  }

  if (request === 'remaining' && money.expectedCents !== null && money.cashReceivedCents > 0) {
    builder
      .plain('I received ')
      .fact(fmt(money.cashReceivedCents), 'amount received')
      .plain(' of the expected ')
      .fact(fmt(money.expectedCents), 'expected amount')
      .plain('. Could you explain the difference or confirm when the remaining ')
      .fact(fmt(money.remainingCents ?? 0), 'remaining amount')
      .plain(' will be refunded?');
  } else {
    if (money.expectedCents !== null) {
      builder.plain('I expected a refund of ').fact(fmt(money.expectedCents), 'refund amount');
    } else {
      builder.plain('I expected a refund of ').fact(null, 'refund amount');
    }
    if (refundCase.expectedRefundDate) {
      builder.plain(' by ').fact(formatShortDate(refundCase.expectedRefundDate), 'expected date');
      const sourcePhrase = refundCase.expectedRefundSource
        ? SOURCE_PHRASES[refundCase.expectedRefundSource]
        : null;
      if (sourcePhrase) builder.plain(` ${sourcePhrase}`);
    }
    builder.plain(', but I haven’t confirmed receiving it yet. ');
    builder.plain(
      tone === 'firm'
        ? 'Please confirm the refund status and the date it will be completed.'
        : 'Could you please confirm the refund status and expected completion date?',
    );
  }

  if (tone !== 'concise' && evidenceCount > 0) {
    builder.plain(' I can share the return evidence I have if helpful.');
  }
  if (tone === 'firm') {
    builder.plain(' I’m keeping a record of this case and would appreciate a written reply.');
  }
  builder.plain(tone === 'concise' ? '\n\nThanks.' : '\n\nThank you.');

  const subjectTarget = refundCase.orderReference
    ? `order ${refundCase.orderReference}`
    : refundCase.itemName;
  return {
    subject: `Refund status for ${subjectTarget}`,
    segments: builder.segments,
    body: builder.segments.map((segment) => segment.text).join(''),
    missing: builder.missing,
  };
}
