import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox-row';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import { formatShortDate } from '@/domain/dates';
import { evidenceType } from '@/domain/enums';
import type { EvidenceAttachment } from '@/domain/models';
import { MissingCase } from '@/features/cases/components/missing-case';
import { useCaseDetail } from '@/features/cases/use-case-data';
import { EvidenceThumbnail } from '@/features/evidence/components/evidence-thumbnail';
import { setEvidenceIncluded } from '@/features/evidence/evidence-repository';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';

function EvidenceTile({ item, caseId }: { item: EvidenceAttachment; caseId: string }) {
  const { colors } = useTheme();
  const typeLabel = evidenceType.labels[item.evidenceType];
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${typeLabel}, ${item.originalFileName}`}
        accessibilityHint="Opens the evidence viewer"
        onPress={() =>
          router.push({
            pathname: '/case/[id]/evidence/[evidenceId]',
            params: { id: caseId, evidenceId: item.id },
          })
        }
      >
        <EvidenceThumbnail
          storedFileName={item.storedFileName}
          mimeType={item.mimeType}
          accessibilityLabel={typeLabel}
        />
      </Pressable>
      <View style={styles.tileFooter}>
        <View style={styles.tileText}>
          <AppText variant="label" tone="muted" numberOfLines={1} style={styles.tileLabel}>
            {item.evidenceDate ? `${typeLabel} · ${formatShortDate(item.evidenceDate)}` : typeLabel}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.tileName}>
            {item.note ?? item.originalFileName}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Include in export"
          accessibilityState={{ checked: item.includeInExport }}
          hitSlop={12}
          onPress={() => setEvidenceIncluded(item.id, !item.includeInExport)}
        >
          <Checkbox checked={item.includeInExport} />
        </Pressable>
      </View>
    </View>
  );
}

export default function EvidenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useCaseDetail(id);
  const { colors } = useTheme();

  if (!detail.loaded) return <Screen>{null}</Screen>;
  if (!detail.refundCase) return <MissingCase />;
  const missing = detail.readiness?.firstMissing;
  const addEvidence = (source?: 'camera' | 'file', type?: string) =>
    router.push({
      pathname: '/case/[id]/evidence/new',
      params: { id, ...(source ? { source } : {}), ...(type ? { type } : {}) },
    });

  return (
    <Screen
      header={<TopBar title={detail.refundCase.itemName} onLeadingPress={() => router.back()} />}
      footer={
        <BottomBar>
          <Button label="Take photo" icon="camera" flex={1} onPress={() => addEvidence('camera')} />
          <Button label="Choose file" variant="secondary" flex={1} onPress={() => addEvidence()} />
        </BottomBar>
      }
    >
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          Evidence{' '}
          <AppText variant="title" tone="faint">
            {detail.evidence.length}
          </AppText>
        </AppText>
        <AppText variant="caption" tone="muted">
          Originals stay on this device. Checked files are listed when you export.
        </AppText>
      </View>
      <View style={styles.grid}>
        {detail.evidence.map((item) => (
          <EvidenceTile key={item.id} item={item} caseId={id} />
        ))}
        {missing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${missing.label}`}
            accessibilityHint="Missing item in case readiness"
            onPress={() => addEvidence(undefined, missing.suggestedType)}
            style={[styles.missing, { borderColor: colors.faint }]}
          >
            <View style={[styles.plus, { backgroundColor: colors.accent }]}>
              <Icon name="add" size={18} color={colors.onAccent} />
            </View>
            <View style={styles.tileText}>
              <AppText variant="bodyStrong">{missing.label}</AppText>
              <AppText variant="caption" tone="muted">
                Missing — completes case readiness
              </AppText>
            </View>
          </Pressable>
        ) : null}
      </View>
      <Notice icon="info">
        Adding a bank or card statement? Hide unrelated transactions and account numbers first.
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
  },
  tileText: { flex: 1 },
  tileLabel: { fontSize: 10, letterSpacing: 0.8 },
  tileName: { fontSize: 14 },
  missing: {
    flexBasis: '100%',
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  plus: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
