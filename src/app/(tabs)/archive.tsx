import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { CaseRow } from '@/features/cases/components/case-row';
import { useArchivedCases, useHomeData } from '@/features/cases/use-case-data';
import { spacing } from '@/theme/tokens';

type ArchiveView = 'resolved' | 'archived';

export default function ArchiveScreen() {
  const [view, setView] = useState<ArchiveView>('resolved');
  const home = useHomeData();
  const archived = useArchivedCases();
  const items = view === 'resolved' ? home.resolved : archived.summaries;

  return (
    <Screen scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.refundCase.id}
        renderItem={({ item }) => <CaseRow summary={item} showProgress={false} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.header}>
              <AppText variant="label" tone="muted">
                Kept on this device
              </AppText>
              <AppText variant="title" accessibilityRole="header">
                Archive
              </AppText>
            </View>
            <SegmentedControl
              accessibilityLabel="Show"
              value={view}
              onChange={setView}
              options={[
                { value: 'resolved', label: `Resolved · ${home.resolved.length}` },
                { value: 'archived', label: `Archived · ${archived.summaries.length}` },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          home.loaded && archived.loaded ? (
            <EmptyState
              title={view === 'resolved' ? 'No resolved cases yet' : 'Nothing archived'}
              body={
                view === 'resolved'
                  ? 'When you record a full refund or store credit, or close a case, it moves here.'
                  : 'Archive a case from Manage case to hide it from your lists. Archived cases keep all their records.'
              }
            />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  headerBlock: { gap: spacing.xl, paddingBottom: spacing.sm },
  header: { gap: spacing.sm, paddingTop: spacing.xl },
});
