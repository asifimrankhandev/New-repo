import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SettingsGroup, ToggleRow } from '@/components/ui/settings-group';
import { TopBar } from '@/components/ui/top-bar';
import type { EvidenceAttachment } from '@/domain/models';
import { MissingCase } from '@/features/cases/components/missing-case';
import {
  EvidenceFields,
  evidenceFormSchema,
  type EvidenceFormValues,
} from '@/features/evidence/components/evidence-fields';
import { EvidenceThumbnail } from '@/features/evidence/components/evidence-thumbnail';
import {
  removeEvidence,
  selectEvidence,
  setEvidenceIncluded,
  updateEvidence,
} from '@/features/evidence/evidence-repository';
import { getEvidenceFile, isImageMimeType } from '@/features/evidence/evidence-storage';
import { confirm, showError } from '@/lib/dialogs';
import { useForm } from '@/lib/use-form';
import { spacing } from '@/theme/tokens';

function formatBytes(bytes: number) {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function EvidenceViewerScreen() {
  const { evidenceId } = useLocalSearchParams<{ id: string; evidenceId: string }>();
  const { data, updatedAt } = useLiveQuery(selectEvidence(evidenceId), [evidenceId]);
  const item = data[0];
  if (updatedAt === undefined) return <Screen>{null}</Screen>;
  if (!item) return <MissingCase />;
  return <EvidenceViewer item={item} />;
}

function EvidenceViewer({ item }: { item: EvidenceAttachment }) {
  const form = useForm<EvidenceFormValues>({
    evidenceType: item.evidenceType,
    evidenceDate: item.evidenceDate ?? '',
    note: item.note ?? '',
  });
  const file = getEvidenceFile(item.storedFileName);

  const save = () => {
    const parsed = form.validate(evidenceFormSchema);
    if (!parsed) return;
    updateEvidence(item.id, parsed);
    router.back();
  };

  const open = async () => {
    try {
      if (await file.canPreview({ mimeType: item.mimeType })) {
        await file.preview({ title: item.originalFileName, mimeType: item.mimeType });
      } else {
        await Sharing.shareAsync(file.uri, { mimeType: item.mimeType });
      }
    } catch (error) {
      showError('Couldn’t open the file', error);
    }
  };

  const share = async () => {
    const ok = await confirm({
      title: 'Share this file?',
      message:
        'It may contain your address, order numbers or other personal details. Whoever receives it can keep or forward it.',
      confirmLabel: 'Share',
    });
    if (!ok) return;
    try {
      await Sharing.shareAsync(file.uri, {
        mimeType: item.mimeType,
        dialogTitle: item.originalFileName,
      });
    } catch (error) {
      showError('Couldn’t share the file', error);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Remove this evidence?',
      message: 'The file is deleted from this device.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) {
      removeEvidence(item.id);
      router.back();
    }
  };

  return (
    <Screen
      header={<TopBar title="Evidence" onLeadingPress={() => router.back()} />}
      footer={
        <BottomBar>
          <Button label="Remove" variant="danger" onPress={() => void remove()} />
          <Button label="Save changes" flex={1} onPress={save} />
        </BottomBar>
      }
    >
      <Card padded={false} style={styles.preview}>
        <EvidenceThumbnail
          storedFileName={item.storedFileName}
          mimeType={item.mimeType}
          height={isImageMimeType(item.mimeType) ? 320 : 160}
          accessibilityLabel={item.originalFileName}
        />
        <View style={styles.meta}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {item.originalFileName}
            </AppText>
            <AppText variant="caption" tone="muted">
              {`Added by you · ${formatBytes(item.sizeBytes)}`}
            </AppText>
          </View>
        </View>
        {file.exists ? (
          <View style={styles.actions}>
            <Button
              label="Open"
              variant="secondary"
              size="small"
              flex={1}
              onPress={() => void open()}
            />
            <Button
              label="Share file"
              variant="secondary"
              size="small"
              flex={1}
              onPress={() => void share()}
            />
          </View>
        ) : null}
      </Card>
      <EvidenceFields form={form} />
      <SettingsGroup>
        <ToggleRow
          label="Include in exports"
          description="Listed in the case summary when you share it"
          value={item.includeInExport}
          onValueChange={(value) => setEvidenceIncluded(item.id, value)}
        />
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { overflow: 'hidden', gap: 0 },
  meta: { flexDirection: 'row', padding: spacing.md, paddingBottom: 0 },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  flex: { flex: 1 },
});
