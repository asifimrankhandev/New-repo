import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BeaconMark } from '@/components/ui/beacon-mark';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatGrid } from '@/components/ui/stat-grid';
import { formatShortDate } from '@/domain/dates';
import { formatCents, splitFormattedCents } from '@/domain/money';
import { AttentionCard } from '@/features/cases/components/attention-card';
import { CaseRow } from '@/features/cases/components/case-row';
import { type CaseSummary, useHomeData } from '@/features/cases/use-case-data';
import { spacing } from '@/theme/tokens';

type Filter = 'all' | 'attention' | 'waiting' | 'transit' | 'partial';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All active' },
  { value: 'attention', label: 'Action needed' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'transit', label: 'In transit' },
  { value: 'partial', label: 'Partial' },
];

function matchesFilter(filter: Filter, summary: CaseSummary, inAttention: boolean) {
  switch (filter) {
    case 'all':
      return true;
    case 'attention':
      return inAttention;
    case 'waiting':
      return !inAttention && summary.refundCase.status !== 'return-in-transit';
    case 'transit':
      return summary.refundCase.status === 'return-in-transit';
    case 'partial':
      return summary.refundCase.status === 'partial-refund';
  }
}

export default function HomeScreen() {
  const { loaded, needsAttention, waiting, totals } = useHomeData();
  const [filter, setFilter] = useState<Filter>('all');
  const [showFilters, setShowFilters] = useState(false);

  if (!loaded) return <Screen>{null}</Screen>;

  const attention = needsAttention.filter((item) => matchesFilter(filter, item, true));
  const others = waiting.filter((item) => matchesFilter(filter, item, false));
  const hasCases = totals.activeCount > 0;
  const hero = splitFormattedCents(totals.awaitingCents);
  const today = new Date();

  return (
    <Screen>
      <View style={styles.header}>
        <BeaconMark />
        <View style={styles.headerActions}>
          <IconButton
            icon="search"
            accessibilityLabel="Search cases"
            onPress={() => router.push('/search')}
          />
          {hasCases ? (
            <IconButton
              icon="filter"
              accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
              onPress={() => setShowFilters((value) => !value)}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.overview}>
        <AppText variant="label" tone="muted">
          {`${formatShortDate(today)} — ${totals.activeCount} active ${totals.activeCount === 1 ? 'case' : 'cases'}`}
        </AppText>
        {hasCases && totals.hasExpectedAmounts ? (
          <>
            <AppText
              variant="display"
              accessibilityLabel={`${formatCents(totals.awaitingCents)} awaiting confirmation`}
            >
              {hero.whole}
              <AppText variant="display" tone="faint">
                {hero.fraction}
              </AppText>
            </AppText>
            <AppText variant="bodyLarge" tone="muted">
              {totals.awaitingRetailers > 0
                ? `awaiting confirmation from ${totals.awaitingRetailers} ${totals.awaitingRetailers === 1 ? 'retailer' : 'retailers'}`
                : 'no amounts awaiting confirmation'}
            </AppText>
          </>
        ) : (
          <AppText variant="headline" accessibilityRole="header">
            {hasCases ? 'Add expected amounts to see what’s outstanding.' : 'Your cases'}
          </AppText>
        )}
        {hasCases ? (
          <StatGrid
            stats={[
              { label: 'Confirmed', value: formatCents(totals.confirmedCents) },
              {
                label: 'Action',
                value: `${needsAttention.length} ${needsAttention.length === 1 ? 'case' : 'cases'}`,
              },
              {
                label: 'Next date',
                value: totals.nextDate ? formatShortDate(totals.nextDate) : '—',
              },
            ]}
          />
        ) : null}
        <Button
          label="New refund case"
          icon="add"
          iconPlacement="tile"
          onPress={() => router.push('/case/new')}
        />
      </View>

      {showFilters && hasCases ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <ChoiceChips
            options={FILTERS}
            value={filter}
            onChange={(value) => setFilter(value || 'all')}
          />
        </ScrollView>
      ) : null}

      {!hasCases ? (
        <EmptyState
          title="No open cases"
          body="When you return something and the refund hasn’t arrived, add it here. You’ll see the next sensible step and keep the evidence together."
        />
      ) : null}

      {attention.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader index={1} title="Needs attention" />
          {attention.map((summary) => (
            <AttentionCard key={summary.refundCase.id} summary={summary} />
          ))}
        </View>
      ) : null}

      {others.length > 0 ? (
        <View style={styles.sectionTight}>
          <SectionHeader index={attention.length > 0 ? 2 : 1} title="Waiting for refund" />
          {others.map((summary) => (
            <CaseRow key={summary.refundCase.id} summary={summary} />
          ))}
        </View>
      ) : null}

      {hasCases && attention.length === 0 && others.length === 0 ? (
        <AppText variant="body" tone="muted">
          No cases match this filter.
        </AppText>
      ) : null}

      <Notice icon="shield">
        Stored only on this device. RefundBeacon organizes your case — it doesn’t issue refunds or
        contact retailers for you.
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginRight: -spacing.md,
  },
  headerActions: { flexDirection: 'row' },
  overview: { gap: spacing.md },
  filters: { gap: spacing.sm },
  section: { gap: spacing.md },
  sectionTight: { gap: spacing.xs },
});
