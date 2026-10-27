import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox-row';
import { SectionHeader } from '@/components/ui/section-header';
import type { Readiness } from '@/domain/readiness';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

/** Evidence completeness checklist — what's on file, not how strong a claim is. */
export function ReadinessList({ readiness, caseId }: { readiness: Readiness; caseId: string }) {
  const { colors } = useTheme();
  return (
    <View>
      <SectionHeader
        title={`Case readiness · ${readiness.satisfiedCount}/${readiness.total}`}
        trailing={
          <Button
            label="All evidence"
            variant="secondary"
            size="small"
            onPress={() => router.push({ pathname: '/case/[id]/evidence', params: { id: caseId } })}
          />
        }
      />
      {readiness.items.map((item) => (
        <View
          key={item.id}
          style={[styles.row, { borderBottomColor: colors.line }]}
          accessible={item.satisfied}
          accessibilityLabel={
            item.satisfied
              ? `${item.label}: ${item.fileCount} file${item.fileCount === 1 ? '' : 's'}`
              : undefined
          }
        >
          <Checkbox checked={item.satisfied} />
          <AppText variant={item.satisfied ? 'body' : 'bodyStrong'} style={styles.label}>
            {item.label}
          </AppText>
          {item.satisfied ? (
            <AppText variant="label" tone="muted">
              {`${item.fileCount} ${item.fileCount === 1 ? 'file' : 'files'}`}
            </AppText>
          ) : (
            <Button
              label="Add"
              variant="secondary"
              size="small"
              accessibilityLabel={`Add ${item.label}`}
              onPress={() =>
                router.push({
                  pathname: '/case/[id]/evidence/new',
                  params: { id: caseId, type: item.suggestedType },
                })
              }
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    borderBottomWidth: 1,
  },
  label: { flex: 1 },
});
