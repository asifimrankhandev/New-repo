import { getDisplayState, inferInitialStatus, isFollowUpDue } from './case-state';
import { getNextStep } from './next-step';
import { getReadiness } from './readiness';
import { reconcile } from './reconciliation';
import { makeCase, makeEntry, makeEvent } from './test-fixtures';

const TODAY = '2026-10-27';

describe('reconcile', () => {
  it('keeps store credit and exchanges out of cash', () => {
    const result = reconcile(makeCase({ expectedRefundCents: 12999 }), [
      makeEntry({ kind: 'cash', amountCents: 8999 }),
      makeEntry({ kind: 'store-credit', amountCents: 2000 }),
      makeEntry({ kind: 'exchange', amountCents: 1000 }),
    ]);
    expect(result).toMatchObject({
      cashReceivedCents: 8999,
      storeCreditCents: 2000,
      exchangeCents: 1000,
      remainingCents: 4000,
      overageCents: 0,
    });
  });

  it('reports unknown rather than zero when no expected amount exists', () => {
    expect(reconcile(makeCase({ expectedRefundCents: null }), []).remainingCents).toBeNull();
  });

  it('shows overage instead of clamping it away', () => {
    const result = reconcile(makeCase({ expectedRefundCents: 1000 }), [
      makeEntry({ amountCents: 1500 }),
    ]);
    expect(result.remainingCents).toBe(0);
    expect(result.overageCents).toBe(500);
  });
});

describe('follow-up due', () => {
  it('is due when the recorded date has passed without a refund', () => {
    expect(isFollowUpDue(makeCase(), [], TODAY)).toBe(true);
    expect(getDisplayState(makeCase(), [], TODAY).label).toBe('Follow-up due');
  });

  it('is not due before the date or once fully refunded', () => {
    expect(isFollowUpDue(makeCase({ expectedRefundDate: '2026-11-03' }), [], TODAY)).toBe(false);
    expect(isFollowUpDue(makeCase(), [makeEntry({ amountCents: 14800 })], TODAY)).toBe(false);
    expect(isFollowUpDue(makeCase({ status: 'refunded' }), [], TODAY)).toBe(false);
  });
});

describe('inferInitialStatus', () => {
  it('derives status from recorded facts only', () => {
    expect(inferInitialStatus({ handoffDate: null, returnMethod: null })).toBe('return-planned');
    expect(inferInitialStatus({ handoffDate: TODAY, returnMethod: 'carrier-drop-off' })).toBe(
      'return-in-transit',
    );
    expect(inferInitialStatus({ handoffDate: TODAY, returnMethod: 'in-store' })).toBe(
      'refund-pending',
    );
  });
});

describe('getNextStep', () => {
  const base = { events: [], entries: [], today: TODAY };

  it('asks to record the hand-over first', () => {
    const step = getNextStep({
      ...base,
      refundCase: makeCase({ status: 'return-planned', handoffDate: null }),
    });
    expect(step.action).toBe('record-handoff');
  });

  it('draws no refund conclusion while in transit', () => {
    const step = getNextStep({ ...base, refundCase: makeCase({ status: 'return-in-transit' }) });
    expect(step.action).toBe('check-tracking');
  });

  it('asks for a timeframe when no expected date exists', () => {
    const step = getNextStep({ ...base, refundCase: makeCase({ expectedRefundDate: null }) });
    expect(step.action).toBe('add-expected-date');
  });

  it('suggests waiting until a future date and cites its source', () => {
    const step = getNextStep({
      ...base,
      refundCase: makeCase({ expectedRefundDate: '2026-11-03' }),
    });
    expect(step.action).toBe('wait');
    expect(step.reasons[0]).toContain('retailer message');
  });

  it('suggests contacting the retailer after the date passes', () => {
    const step = getNextStep({
      ...base,
      events: [makeEvent({ type: 'delivered' })],
      refundCase: makeCase(),
    });
    expect(step.action).toBe('contact-retailer');
    expect(step.reasons).toContain('Return delivered Oct 12');
  });

  it('moves on to the payment method after the user already followed up', () => {
    const step = getNextStep({
      ...base,
      events: [
        makeEvent({ type: 'retailer-contacted', occurredAt: new Date(2026, 9, 24).getTime() }),
      ],
      refundCase: makeCase(),
    });
    expect(step.action).toBe('check-payment-method');
    expect(step.officialSource?.url).toContain('consumerfinance.gov');
  });

  it('asks about the balance on a partial refund', () => {
    const step = getNextStep({
      ...base,
      entries: [makeEntry({ amountCents: 8999 })],
      refundCase: makeCase({ status: 'partial-refund', expectedRefundCents: 12999 }),
    });
    expect(step.action).toBe('ask-remaining');
  });

  it('respects a dismissal until the facts change', () => {
    const refundCase = makeCase({ dismissedNextStep: 'contact-retailer:2026-10-20' });
    expect(getNextStep({ ...base, refundCase }).key).toBe('dismissed');
    const changed = { ...refundCase, expectedRefundDate: '2026-10-25' };
    expect(getNextStep({ ...base, refundCase: changed }).action).toBe('contact-retailer');
  });

  it('stops suggesting once resolved', () => {
    expect(getNextStep({ ...base, refundCase: makeCase({ status: 'refunded' }) }).action).toBe(
      'none',
    );
  });
});

describe('getReadiness', () => {
  it('counts evidence per checklist item', () => {
    const readiness = getReadiness(makeCase(), [
      { evidenceType: 'purchase-receipt' },
      { evidenceType: 'return-label' },
      { evidenceType: 'drop-off-receipt' },
      { evidenceType: 'retailer-message' },
    ]);
    expect(readiness.satisfiedCount).toBe(4);
    expect(readiness.total).toBe(5);
    expect(readiness.firstMissing?.id).toBe('delivery');
  });

  it('drops shipping items for in-store returns', () => {
    const readiness = getReadiness(makeCase({ returnMethod: 'in-store' }), []);
    expect(readiness.items.map((item) => item.id)).toEqual(['purchase', 'hand-over', 'retailer']);
  });
});
