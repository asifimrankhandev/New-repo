import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { getDisplayState } from '@/domain/case-state';
import { todayIso } from '@/domain/dates';
import { isResolvedStatus } from '@/domain/enums';
import type {
  EvidenceAttachment,
  RefundCase,
  RefundEntry,
  Reminder,
  TimelineEvent,
} from '@/domain/models';
import { getNextStep, type NextStep } from '@/domain/next-step';
import { getReadiness, type Readiness } from '@/domain/readiness';
import { reconcile, type Reconciliation } from '@/domain/reconciliation';
import { endOfDay, useNow } from '@/lib/use-now';
import {
  selectEvidenceForCase,
  selectEvidenceTypes,
} from '@/features/evidence/evidence-repository';
import {
  selectAllRefundEntries,
  selectRefundEntriesForCase,
} from '@/features/outcome/outcome-service';
import {
  selectPendingReminders,
  selectRemindersForCase,
} from '@/features/reminders/reminder-repository';
import { selectAllEvents, selectEventsForCase } from '@/features/timeline/timeline-repository';

import { selectActiveCases, selectArchivedCases, selectCase } from './case-repository';

export interface CaseSummary {
  refundCase: RefundCase;
  money: Reconciliation;
  followUpDue: boolean;
  statusLabel: string;
  dueReminder: Reminder | null;
}

/** Case that needs action, with the insight its Home card shows. */
export interface AttentionSummary extends CaseSummary {
  nextStep: NextStep;
  readiness: Readiness;
  deliveredAt: number | null;
}

function groupByCase<T extends { caseId: string }>(rows: readonly T[]): Map<string, T[]> {
  const byCase = new Map<string, T[]>();
  for (const row of rows) {
    const list = byCase.get(row.caseId);
    if (list) list.push(row);
    else byCase.set(row.caseId, [row]);
  }
  return byCase;
}

function summarize(
  refundCase: RefundCase,
  entries: readonly RefundEntry[],
  reminders: readonly Reminder[],
  now: number,
): CaseSummary {
  const display = getDisplayState(refundCase, entries, todayIso(new Date(now)));
  const dueBy = endOfDay(now);
  const dueReminder =
    reminders.find((item) => item.caseId === refundCase.id && item.scheduledAt <= dueBy) ?? null;
  return {
    refundCase,
    money: reconcile(refundCase, entries),
    followUpDue: display.followUpDue,
    statusLabel: display.label,
    dueReminder,
  };
}

export interface HomeData {
  loaded: boolean;
  needsAttention: AttentionSummary[];
  waiting: CaseSummary[];
  resolved: CaseSummary[];
  totals: {
    activeCount: number;
    awaitingCents: number;
    awaitingRetailers: number;
    confirmedCents: number;
    hasExpectedAmounts: boolean;
    nextDate: string | null;
  };
}

export function useHomeData(): HomeData {
  const casesQuery = useLiveQuery(selectActiveCases());
  const entriesQuery = useLiveQuery(selectAllRefundEntries());
  const remindersQuery = useLiveQuery(selectPendingReminders());
  // Two whole-table reads instead of per-card queries: Home stays fast as cases grow.
  const eventsQuery = useLiveQuery(selectAllEvents());
  const evidenceQuery = useLiveQuery(selectEvidenceTypes());
  const now = useNow();

  return useMemo(() => {
    const today = todayIso(new Date(now));
    const entriesByCase = groupByCase(entriesQuery.data);
    const eventsByCase = groupByCase(eventsQuery.data);
    const evidenceByCase = groupByCase(evidenceQuery.data);
    const pendingReminders = remindersQuery.data.map((row) => row.reminder);
    const summaries = casesQuery.data.map((refundCase) =>
      summarize(refundCase, entriesByCase.get(refundCase.id) ?? [], pendingReminders, now),
    );
    const open = summaries.filter((item) => !isResolvedStatus(item.refundCase.status));
    const attentionIds = new Set(
      open.filter((item) => item.followUpDue || item.dueReminder).map((item) => item.refundCase.id),
    );
    const needsAttention = open
      .filter((item) => attentionIds.has(item.refundCase.id))
      .map((item): AttentionSummary => {
        const events = eventsByCase.get(item.refundCase.id) ?? [];
        const entries = entriesByCase.get(item.refundCase.id) ?? [];
        const delivered = events.find((event) => event.type === 'delivered');
        return {
          ...item,
          nextStep: getNextStep({ refundCase: item.refundCase, events, entries, today }),
          readiness: getReadiness(item.refundCase, evidenceByCase.get(item.refundCase.id) ?? []),
          deliveredAt: delivered?.occurredAt ?? null,
        };
      });
    const waiting = open
      .filter((item) => !attentionIds.has(item.refundCase.id))
      .sort((a, b) =>
        (a.refundCase.expectedRefundDate ?? '9999').localeCompare(
          b.refundCase.expectedRefundDate ?? '9999',
        ),
      );
    const withRemaining = open.filter((item) => (item.money.remainingCents ?? 0) > 0);
    const upcomingDates = [
      ...open
        .map((item) => item.refundCase.expectedRefundDate)
        .filter((date): date is string => !!date && date >= today),
      ...pendingReminders
        .filter((item) => item.scheduledAt > now)
        .map((item) => todayIso(new Date(item.scheduledAt))),
    ].sort();

    return {
      loaded: casesQuery.updatedAt !== undefined,
      needsAttention,
      waiting,
      resolved: summaries.filter((item) => isResolvedStatus(item.refundCase.status)),
      totals: {
        activeCount: open.length,
        awaitingCents: withRemaining.reduce(
          (sum, item) => sum + (item.money.remainingCents ?? 0),
          0,
        ),
        awaitingRetailers: new Set(
          withRemaining.map((item) => item.refundCase.retailerName.toLowerCase()),
        ).size,
        confirmedCents: open.reduce((sum, item) => sum + item.money.cashReceivedCents, 0),
        hasExpectedAmounts: open.some((item) => item.money.expectedCents !== null),
        nextDate: upcomingDates[0] ?? null,
      },
    };
  }, [
    casesQuery.data,
    casesQuery.updatedAt,
    entriesQuery.data,
    remindersQuery.data,
    eventsQuery.data,
    evidenceQuery.data,
    now,
  ]);
}

/** Summaries for an arbitrary list of cases (archive, search), with live refund entries. */
export function useCaseSummaries(refundCases: readonly RefundCase[]): CaseSummary[] {
  const entriesQuery = useLiveQuery(selectAllRefundEntries());
  const now = useNow();
  return useMemo(() => {
    const entriesByCase = groupByCase(entriesQuery.data);
    return refundCases.map((refundCase) => {
      const summary = summarize(refundCase, entriesByCase.get(refundCase.id) ?? [], [], now);
      return refundCase.archivedAt === null ? summary : { ...summary, statusLabel: 'Archived' };
    });
  }, [refundCases, entriesQuery.data, now]);
}

export function useArchivedCases() {
  const { data, updatedAt } = useLiveQuery(selectArchivedCases());
  return { summaries: useCaseSummaries(data), loaded: updatedAt !== undefined };
}

export interface CaseDetail {
  loaded: boolean;
  refundCase: RefundCase | undefined;
  events: TimelineEvent[];
  evidence: EvidenceAttachment[];
  entries: RefundEntry[];
  reminders: Reminder[];
  money: Reconciliation | null;
  nextStep: NextStep | null;
  readiness: Readiness | null;
  statusLabel: string;
  followUpDue: boolean;
}

export function useCaseDetail(caseId: string): CaseDetail {
  const caseQuery = useLiveQuery(selectCase(caseId), [caseId]);
  const eventsQuery = useLiveQuery(selectEventsForCase(caseId), [caseId]);
  const evidenceQuery = useLiveQuery(selectEvidenceForCase(caseId), [caseId]);
  const entriesQuery = useLiveQuery(selectRefundEntriesForCase(caseId), [caseId]);
  const remindersQuery = useLiveQuery(selectRemindersForCase(caseId), [caseId]);

  return useMemo(() => {
    const refundCase = caseQuery.data[0];
    const events = [...eventsQuery.data].sort((a, b) => b.occurredAt - a.occurredAt);
    const entries = entriesQuery.data;
    const display = refundCase ? getDisplayState(refundCase, entries) : null;
    return {
      loaded: caseQuery.updatedAt !== undefined,
      refundCase,
      events,
      evidence: evidenceQuery.data,
      entries,
      reminders: remindersQuery.data,
      money: refundCase ? reconcile(refundCase, entries) : null,
      nextStep: refundCase ? getNextStep({ refundCase, events, entries }) : null,
      readiness: refundCase ? getReadiness(refundCase, evidenceQuery.data) : null,
      statusLabel: display?.label ?? '',
      followUpDue: display?.followUpDue ?? false,
    };
  }, [
    caseQuery.data,
    caseQuery.updatedAt,
    eventsQuery.data,
    evidenceQuery.data,
    entriesQuery.data,
    remindersQuery.data,
  ]);
}
