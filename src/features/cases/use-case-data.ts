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
import { selectEvidenceForCase } from '@/features/evidence/evidence-repository';
import {
  selectAllRefundEntries,
  selectRefundEntriesForCase,
} from '@/features/outcome/outcome-service';
import {
  selectPendingReminders,
  selectRemindersForCase,
} from '@/features/reminders/reminder-repository';
import { selectEventsForCase } from '@/features/timeline/timeline-repository';

import { selectActiveCases, selectArchivedCases, selectCase } from './case-repository';

export interface CaseSummary {
  refundCase: RefundCase;
  money: Reconciliation;
  followUpDue: boolean;
  statusLabel: string;
  dueReminder: Reminder | null;
}

function groupEntries(entries: readonly RefundEntry[]) {
  const byCase = new Map<string, RefundEntry[]>();
  for (const entry of entries) {
    const list = byCase.get(entry.caseId) ?? [];
    list.push(entry);
    byCase.set(entry.caseId, list);
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
  needsAttention: CaseSummary[];
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
  const now = useNow();

  return useMemo(() => {
    const today = todayIso(new Date(now));
    const entriesByCase = groupEntries(entriesQuery.data);
    const pendingReminders = remindersQuery.data.map((row) => row.reminder);
    const summaries = casesQuery.data.map((refundCase) =>
      summarize(refundCase, entriesByCase.get(refundCase.id) ?? [], pendingReminders, now),
    );
    const open = summaries.filter((item) => !isResolvedStatus(item.refundCase.status));
    const needsAttention = open.filter((item) => item.followUpDue || item.dueReminder);
    const waiting = open
      .filter((item) => !needsAttention.includes(item))
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
  }, [casesQuery.data, casesQuery.updatedAt, entriesQuery.data, remindersQuery.data, now]);
}

/** Summaries for an arbitrary list of cases (archive, search), with live refund entries. */
export function useCaseSummaries(refundCases: readonly RefundCase[]): CaseSummary[] {
  const entriesQuery = useLiveQuery(selectAllRefundEntries());
  const now = useNow();
  return useMemo(() => {
    const entriesByCase = groupEntries(entriesQuery.data);
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
