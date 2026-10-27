import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentBar } from '@/components/ui/segment-bar';
import { StatusTag } from '@/components/ui/status-tag';
import { formatShortDate, formatTime } from '@/domain/dates';
import { reminderShortLabels } from '@/domain/enums';
import { formatCents } from '@/domain/money';
import { spacing } from '@/theme/tokens';

import type { AttentionSummary } from '../use-case-data';

/** Home card for a case that needs action: next step, readiness and the two likely actions. */
export function AttentionCard({ summary }: { summary: AttentionSummary }) {
  const { refundCase, dueReminder, nextStep, readiness, money, deliveredAt } = summary;
  const amount = money.remainingCents ?? money.expectedCents ?? refundCase.purchaseAmountCents;
  const facts = [
    refundCase.handoffDate ? `Returned ${formatShortDate(refundCase.handoffDate)}` : null,
    deliveredAt !== null ? `Delivered ${formatShortDate(new Date(deliveredAt))}` : null,
  ].filter(Boolean);
  const openCase = () => router.push({ pathname: '/case/[id]', params: { id: refundCase.id } });

  const primaryAction =
    nextStep.action === 'contact-retailer' || nextStep.action === 'ask-remaining'
      ? {
          label: 'Draft follow-up',
          onPress: () =>
            router.push({
              pathname: '/case/[id]/follow-up',
              params: {
                id: refundCase.id,
                ...(nextStep.action === 'ask-remaining' ? { request: 'remaining' } : {}),
              },
            }),
        }
      : { label: 'Open case', onPress: openCase };

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="label" tone="muted" numberOfLines={1}>
            {refundCase.retailerName}
          </AppText>
          <AppText variant="heading" numberOfLines={2}>
            {refundCase.itemName}
          </AppText>
        </View>
        <AppText variant="amount" style={styles.amount}>
          {formatCents(amount, refundCase.currencyCode)}
        </AppText>
      </View>
      <View style={styles.tags}>
        <StatusTag
          label={
            summary.followUpDue
              ? 'Follow-up due'
              : dueReminder
                ? `${reminderShortLabels[dueReminder.type]} today`
                : summary.statusLabel
          }
          tone="accent"
        />
        {facts.length > 0 ? (
          <AppText variant="caption" tone="muted" style={styles.facts}>
            {facts.join(' · ')}
          </AppText>
        ) : null}
      </View>
      <AppText variant="bodyLarge">
        {nextStep.title}.{' '}
        <AppText variant="bodyLarge" tone="muted">
          {nextStep.reasons[0] ?? ''}
        </AppText>
      </AppText>
      {dueReminder && !summary.followUpDue ? (
        <AppText variant="caption" tone="muted">
          {`Reminder set for ${formatTime(dueReminder.scheduledAt)}`}
        </AppText>
      ) : null}
      <View style={styles.readiness}>
        <SegmentBar
          total={readiness.total}
          filled={readiness.satisfiedCount}
          accessibilityLabel={`Evidence ${readiness.satisfiedCount} of ${readiness.total}`}
        />
        <AppText variant="label" tone="muted">
          {`Evidence ${readiness.satisfiedCount}/${readiness.total}`}
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button
          label={primaryAction.label}
          size="medium"
          flex={1}
          onPress={primaryAction.onPress}
        />
        <Button
          label={readiness.firstMissing ? 'Add proof' : 'Open case'}
          variant="secondary"
          size="medium"
          flex={1}
          accessibilityHint={
            readiness.firstMissing ? `Adds ${readiness.firstMissing.label}` : undefined
          }
          onPress={
            readiness.firstMissing
              ? () =>
                  router.push({
                    pathname: '/case/[id]/evidence/new',
                    params: { id: refundCase.id, type: readiness.firstMissing?.suggestedType },
                  })
              : openCase
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  amount: { fontSize: 20 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  facts: { flexShrink: 1 },
  readiness: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', gap: 10 },
});
