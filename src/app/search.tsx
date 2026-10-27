import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import type { RefundCase } from '@/domain/models';
import { searchCases } from '@/features/cases/case-repository';
import { CaseRow } from '@/features/cases/components/case-row';
import { useCaseSummaries } from '@/features/cases/use-case-data';
import { useTheme } from '@/theme/use-theme';
import { fonts, radius, spacing } from '@/theme/tokens';

const EMPTY: RefundCase[] = [];

export default function SearchScreen() {
  const { colors } = useTheme();
  const [term, setTerm] = useState('');
  const deferredTerm = useDeferredValue(term.trim());
  const { data } = useLiveQuery(searchCases(deferredTerm), [deferredTerm]);
  const summaries = useCaseSummaries(deferredTerm.length === 0 ? EMPTY : data);

  return (
    <Screen
      header={
        <View style={styles.bar}>
          <View
            style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Icon name="search" size={18} color={colors.muted} />
            <TextInput
              autoFocus
              value={term}
              onChangeText={setTerm}
              placeholder="Retailer, item or order number"
              placeholderTextColor={colors.faint}
              accessibilityLabel="Search cases"
              returnKeyType="search"
              autoCorrect={false}
              style={[styles.input, { color: colors.ink }]}
            />
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close search"
            onPress={() => router.back()}
          />
        </View>
      }
    >
      {deferredTerm.length > 0 ? (
        <AppText variant="label" tone="muted" accessibilityLiveRegion="polite">
          {`${summaries.length} ${summaries.length === 1 ? 'result' : 'results'}`}
        </AppText>
      ) : (
        <AppText variant="caption" tone="muted">
          Search runs only on this device.
        </AppText>
      )}
      <View>
        {summaries.map((summary) => (
          <CaseRow key={summary.refundCase.id} summary={summary} showProgress={false} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, minHeight: 46 },
});
