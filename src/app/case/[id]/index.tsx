import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SettingsGroup, SettingsRow } from '@/components/ui/settings-group';
import { StatGrid } from '@/components/ui/stat-grid';
import { StatusTag } from '@/components/ui/status-tag';
import { TopBar } from '@/components/ui/top-bar';
import { formatRelativeDay, formatShortDate, formatTime, formatWeekdayDate } from '@/domain/dates';
import { isResolvedStatus, refundKind, reminderShortLabels } from '@/domain/enums';
import { formatCents } from '@/domain/money';
import { reopenCase, setArchived } from '@/features/cases/case-repository';
import { archiveCase, deleteCase } from '@/features/cases/case-service';
import { MissingCase } from '@/features/cases/components/missing-case';
import { NextStepCard } from '@/features/cases/components/next-step-card';
import { ReadinessList } from '@/features/cases/components/readiness-list';
import { useCaseDetail } from '@/features/cases/use-case-data';
import { deleteRefundEntry } from '@/features/outcome/outcome-service';
import { TimelineList } from '@/features/timeline/components/timeline-list';
import { confirm, showError } from '@/lib/dialogs';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useCaseDetail(id);
  const { colors } = useTheme();
  const { refundCase, money, nextStep, readiness } = detail;

  if (!detail.loaded) return <Screen>{null}</Screen>;
  if (!refundCase || !money) return <MissingCase />;

  const resolved = isResolvedStatus(refundCase.status);
  const fmt = (cents: number) => formatCents(cents, refundCase.currencyCode);
  const go = (
    pathname:
      | '/case/[id]/add-event'
      | '/case/[id]/outcome'
      | '/case/[id]/export'
      | '/case/[id]/edit'
      | '/case/[id]/reminder',
  ) => router.push({ pathname, params: { id } });

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this case?',
      message:
        'Its timeline, refunds, reminders and evidence files will be permanently deleted from this device.',
      confirmLabel: 'Delete case',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCase(id);
      router.back();
    } catch (error) {
      showError('Couldn’t delete the case', error);
    }
  };

  const handleArchive = async () => {
    if (refundCase.archivedAt) {
      setArchived(id, false);
      return;
    }
    const ok = await confirm({
      title: 'Archive this case?',
      message:
        'It’s hidden from your lists and its reminders stop. Nothing is deleted — find it under Archive.',
      confirmLabel: 'Archive',
    });
    if (ok) {
      await archiveCase(id);
      router.back();
    }
  };

  const handleRemoveEntry = async (entryId: string, label: string) => {
    const ok = await confirm({
      title: 'Remove this entry?',
      message: `${label} will be removed from the totals. Use this to correct a mistake.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) deleteRefundEntry(entryId);
  };

  const stats = [
    {
      label: 'Expected',
      value: money.expectedCents === null ? '—' : fmt(money.expectedCents),
      accessibilityValue: money.expectedCents === null ? 'not entered' : undefined,
    },
    { label: 'Received', value: fmt(money.cashReceivedCents) },
    {
      label: 'Remaining',
      value: money.remainingCents === null ? '—' : fmt(money.remainingCents),
      accessibilityValue: money.remainingCents === null ? 'unknown' : undefined,
    },
  ];

  return (
    <Screen
      header={
        <TopBar
          leading="back"
          onLeadingPress={() => router.back()}
          trailing={
            <>
              <IconButton
                icon="share"
                accessibilityLabel="Export case summary"
                onPress={() => go('/case/[id]/export')}
              />
              <IconButton
                icon="edit"
                accessibilityLabel="Edit case details"
                onPress={() => go('/case/[id]/edit')}
              />
            </>
          }
        />
      }
      footer={
        <BottomBar>
          {resolved ? (
            <Button
              label="Reopen case"
              variant="secondary"
              flex={1}
              onPress={() => reopenCase(id)}
            />
          ) : (
            <>
              <Button
                label="Add event"
                icon="add"
                flex={1}
                onPress={() => go('/case/[id]/add-event')}
              />
              <Button
                label="Record outcome"
                variant="secondary"
                flex={1}
                onPress={() => go('/case/[id]/outcome')}
              />
            </>
          )}
        </BottomBar>
      }
    >
      <View style={styles.header}>
        <AppText variant="label" tone="muted" numberOfLines={1}>
          {[refundCase.retailerName, refundCase.orderReference].filter(Boolean).join(' · ')}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {refundCase.itemName}
        </AppText>
        <View style={styles.tags}>
          <StatusTag label={detail.statusLabel} tone={detail.followUpDue ? 'accent' : 'neutral'} />
          <AppText variant="caption" tone="muted">
            {`Updated ${formatRelativeDay(refundCase.updatedAt).toLowerCase()}`}
          </AppText>
        </View>
      </View>

      <View style={styles.money}>
        <StatGrid stats={stats} size="large" />
        {money.storeCreditCents > 0 || money.exchangeCents > 0 ? (
          <AppText variant="caption" tone="muted">
            {[
              money.storeCreditCents > 0 ? `Store credit ${fmt(money.storeCreditCents)}` : null,
              money.exchangeCents > 0 ? `Exchange ${fmt(money.exchangeCents)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            {' — tracked separately from cash.'}
          </AppText>
        ) : null}
        {money.overageCents > 0 ? (
          <AppText variant="caption" tone="muted">
            {`You recorded ${fmt(money.overageCents)} more than expected.`}
          </AppText>
        ) : null}
        <AppText variant="small" tone="muted">
          Arithmetic from amounts you entered — not a statement of what’s owed.
        </AppText>
      </View>

      {refundCase.isSample ? (
        <Notice icon="info" tone="surface" title="Sample case.">
          Explore freely, then delete it from Manage case below.
        </Notice>
      ) : null}

      {nextStep ? <NextStepCard step={nextStep} caseId={id} /> : null}

      {!resolved ? (
        <View style={styles.section}>
          <SectionHeader
            title="Reminders"
            trailing={
              <Button
                label="Set"
                variant="secondary"
                size="small"
                accessibilityLabel="Set a reminder"
                onPress={() => go('/case/[id]/reminder')}
              />
            }
          />
          {detail.reminders.length === 0 ? (
            <AppText variant="caption" tone="muted">
              No reminder set.
            </AppText>
          ) : (
            detail.reminders.map((reminder) => (
              <Pressable
                key={reminder.id}
                accessibilityRole="button"
                accessibilityHint="Edit this reminder"
                onPress={() =>
                  router.push({
                    pathname: '/case/[id]/reminder',
                    params: { id, reminderId: reminder.id },
                  })
                }
                style={[styles.reminderRow, { borderBottomColor: colors.line }]}
              >
                <AppText variant="bodyStrong" style={styles.flex}>
                  {reminderShortLabels[reminder.type]}
                </AppText>
                <AppText variant="mono" tone="muted">
                  {`${formatWeekdayDate(new Date(reminder.scheduledAt))}, ${formatTime(reminder.scheduledAt)}`}
                </AppText>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      {readiness ? <ReadinessList readiness={readiness} caseId={id} /> : null}

      {detail.entries.length > 0 ? (
        <View>
          <SectionHeader title="Refunds recorded" />
          {detail.entries.map((entry) => {
            const label = `${refundKind.labels[entry.kind]} · ${fmt(entry.amountCents)}`;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${formatShortDate(entry.receivedDate)}`}
                accessibilityHint="Remove this entry to correct a mistake"
                onPress={() => void handleRemoveEntry(entry.id, label)}
                style={[styles.reminderRow, { borderBottomColor: colors.line }]}
              >
                <AppText variant="body" style={styles.flex}>
                  {label}
                </AppText>
                <AppText variant="mono" tone="muted">
                  {formatShortDate(entry.receivedDate)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Timeline" />
        <TimelineList events={detail.events} caseId={id} />
      </View>

      {refundCase.notes ? (
        <View style={styles.section}>
          <SectionHeader title="Notes" />
          <AppText variant="body" tone="muted">
            {refundCase.notes}
          </AppText>
        </View>
      ) : null}

      <SettingsGroup title="Manage case">
        <SettingsRow label="Edit details" onPress={() => go('/case/[id]/edit')} />
        <SettingsRow
          label={refundCase.archivedAt ? 'Move back to cases' : 'Archive case'}
          onPress={() => void handleArchive()}
        />
        <SettingsRow label="Delete case" tone="danger" onPress={() => void handleDelete()} />
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.sm },
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  money: { gap: spacing.sm },
  section: { gap: spacing.md },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  flex: { flex: 1 },
});
