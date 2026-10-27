import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { SegmentBar } from '@/components/ui/segment-bar';
import { getProgressStage } from '@/domain/case-state';
import { formatShortDate } from '@/domain/dates';
import { formatCents } from '@/domain/money';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

import type { CaseSummary } from '../use-case-data';

function secondaryLine({ refundCase, money, statusLabel }: CaseSummary): string {
  if (refundCase.status === 'partial-refund' && money.remainingCents !== null) {
    return `${formatCents(money.cashReceivedCents)} of ${formatCents(money.expectedCents ?? 0)} confirmed`;
  }
  if (refundCase.expectedRefundDate && refundCase.status !== 'return-in-transit') {
    return `Expected ${formatShortDate(refundCase.expectedRefundDate)}`;
  }
  return statusLabel;
}

/** Compact list row used for waiting, resolved and archived cases. */
export function CaseRow({
  summary,
  showProgress = true,
}: {
  summary: CaseSummary;
  showProgress?: boolean;
}) {
  const { colors } = useTheme();
  const { refundCase, money } = summary;
  const amount = money.expectedCents ?? refundCase.purchaseAmountCents;
  const stage = getProgressStage(refundCase.status);
  const detail = secondaryLine(summary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${refundCase.itemName}, ${refundCase.retailerName}, ${formatCents(amount)}, ${detail}`}
      onPress={() => router.push({ pathname: '/case/[id]', params: { id: refundCase.id } })}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.line },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={styles.main}>
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
            {refundCase.itemName}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {`${refundCase.retailerName} · ${detail}`}
          </AppText>
        </View>
        <AppText variant="amount" style={styles.amount}>
          {formatCents(amount, refundCase.currencyCode)}
        </AppText>
      </View>
      {showProgress ? (
        <SegmentBar
          total={4}
          filled={stage}
          highlightNext={stage < 4}
          height={3}
          accessibilityLabel={`Stage ${stage} of 4`}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14, gap: 10, borderBottomWidth: 1 },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  title: { fontSize: 16 },
  amount: { fontSize: 16 },
});
