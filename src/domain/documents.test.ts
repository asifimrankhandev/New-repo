import { caseInputSchema, EMPTY_CASE_FORM } from './case-input';
import { buildTextSummary, buildTimelineCsv, SUMMARY_DISCLAIMER, toCsv } from './case-summary';
import { buildFollowUpDraft } from './follow-up-template';
import { makeCase, makeEntry, makeEvent } from './test-fixtures';

describe('buildFollowUpDraft', () => {
  const input = {
    events: [makeEvent({ type: 'delivered' })],
    entries: [],
    evidenceCount: 3,
    tone: 'polite' as const,
    request: 'status' as const,
  };

  it('uses only recorded facts', () => {
    const draft = buildFollowUpDraft({ ...input, refundCase: makeCase() });
    expect(draft.subject).toBe('Refund status for order NP-20931');
    expect(draft.body).toContain('order NP-20931 for the Trail shell jacket');
    expect(draft.body).toContain('delivered on Oct 12');
    expect(draft.body).toContain('$148.00 by Oct 20 as stated in your message');
    expect(draft.missing).toEqual([]);
  });

  it('marks unknown facts as placeholders instead of inventing them', () => {
    const draft = buildFollowUpDraft({
      ...input,
      events: [],
      refundCase: makeCase({ orderReference: null, handoffDate: null, expectedRefundCents: null }),
    });
    expect(draft.missing).toEqual(['order number', 'return date', 'refund amount']);
    expect(draft.body).toContain('[order number]');
  });

  it('never cites an estimate as the retailer’s promise', () => {
    const draft = buildFollowUpDraft({
      ...input,
      refundCase: makeCase({ expectedRefundSource: 'user-estimate' }),
    });
    expect(draft.body).not.toContain('as stated');
  });

  it('asks about the balance for partial refunds', () => {
    const draft = buildFollowUpDraft({
      ...input,
      request: 'remaining',
      entries: [makeEntry({ amountCents: 8999 })],
      refundCase: makeCase({ expectedRefundCents: 12999 }),
    });
    expect(draft.body).toContain('I received $89.99 of the expected $129.99');
    expect(draft.body).toContain('remaining $40.00');
  });
});

describe('case summary', () => {
  const summaryInput = {
    refundCase: makeCase({ notes: 'Private note' }),
    events: [makeEvent({ type: 'delivered', source: 'carrier' as const })],
    entries: [],
    evidence: [],
    options: { includeTimeline: true, includeOrderReference: false, includeNotes: false },
    generatedAt: new Date(2026, 9, 27),
  };

  it('respects the user’s exclusions and always carries the disclaimer', () => {
    const text = buildTextSummary(summaryInput);
    expect(text).not.toContain('NP-20931');
    expect(text).not.toContain('Private note');
    expect(text).toContain('Return delivered (carrier-reported)');
    expect(text).toContain(SUMMARY_DISCLAIMER);
  });

  it('escapes CSV cells', () => {
    expect(toCsv([['a,b', 'say "hi"', null]])).toBe('"a,b","say ""hi""",');
    expect(buildTimelineCsv(summaryInput)).toContain('date,event,reported_by,amount,note');
  });
});

describe('caseInputSchema', () => {
  const valid = {
    ...EMPTY_CASE_FORM,
    retailerName: ' Northpeak Outdoor ',
    itemName: 'Jacket',
    purchaseAmount: '$148.00',
  };

  it('maps form strings to domain values', () => {
    const result = caseInputSchema.parse(valid);
    expect(result).toMatchObject({
      retailerName: 'Northpeak Outdoor',
      purchaseAmountCents: 14800,
      orderReference: null,
      expectedRefundCents: null,
    });
  });

  it('requires a source when an expected date is entered', () => {
    const result = caseInputSchema.safeParse({ ...valid, expectedRefundDate: '2026-10-20' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['expectedRefundSource']);
  });

  it('refuses card numbers as order references', () => {
    const result = caseInputSchema.safeParse({ ...valid, orderReference: '4111 1111 1111 1111' });
    expect(result.success).toBe(false);
  });
});
