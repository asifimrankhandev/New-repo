import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import { evidenceType } from '@/domain/enums';
import {
  EvidenceFields,
  evidenceFormSchema,
  type EvidenceFormValues,
} from '@/features/evidence/components/evidence-fields';
import { EvidenceThumbnail } from '@/features/evidence/components/evidence-thumbnail';
import { addEvidence } from '@/features/evidence/evidence-repository';
import {
  type EvidenceSource,
  type PickedFile,
  pickEvidence,
} from '@/features/evidence/pick-evidence';
import { showError } from '@/lib/dialogs';
import { useForm } from '@/lib/use-form';
import { spacing } from '@/theme/tokens';

export default function NewEvidenceScreen() {
  const params = useLocalSearchParams<{ id: string; type?: string; source?: string }>();
  const presetType = evidenceType.values.find((value) => value === params.type) ?? '';
  const form = useForm<EvidenceFormValues>({
    evidenceType: presetType,
    evidenceDate: '',
    note: '',
  });
  const [file, setFile] = useState<PickedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const autoLaunched = useRef(false);

  const pick = useCallback(async (source: EvidenceSource) => {
    try {
      const picked = await pickEvidence(source);
      if (picked) setFile(picked);
    } catch (error) {
      showError('Couldn’t use that file', error);
    }
  }, []);

  useEffect(() => {
    // Opening from "Take photo" goes straight to the camera, once.
    if (params.source === 'camera' && !autoLaunched.current) {
      autoLaunched.current = true;
      void pick('camera');
    }
  }, [params.source, pick]);

  const save = async () => {
    if (!file) return;
    const parsed = form.validate(evidenceFormSchema);
    if (!parsed) return;
    setSaving(true);
    try {
      await addEvidence({
        caseId: params.id,
        sourceUri: file.uri,
        originalFileName: file.name,
        mimeType: file.mimeType,
        ...parsed,
      });
      router.back();
    } catch (error) {
      showError('Couldn’t save the evidence', error);
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<TopBar title="Add evidence" leading="close" onLeadingPress={() => router.back()} />}
      footer={
        file ? (
          <BottomBar>
            <Button label="Save evidence" flex={1} loading={saving} onPress={() => void save()} />
          </BottomBar>
        ) : undefined
      }
    >
      {file ? (
        <>
          <Card padded={false} style={styles.preview}>
            <EvidenceThumbnail
              uri={file.uri}
              mimeType={file.mimeType}
              height={220}
              accessibilityLabel={`Preview of ${file.name}`}
            />
            <View style={styles.previewFooter}>
              <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
                {file.name}
              </AppText>
              <Button
                label="Replace"
                variant="secondary"
                size="small"
                onPress={() => setFile(null)}
              />
            </View>
          </Card>
          <EvidenceFields form={form} />
        </>
      ) : (
        <View style={styles.choices}>
          <AppText variant="headline" accessibilityRole="header" style={styles.title}>
            Add a photo or document
          </AppText>
          <Button label="Take photo" icon="camera" onPress={() => void pick('camera')} />
          <Button
            label="Choose photo"
            icon="photo"
            variant="secondary"
            onPress={() => void pick('library')}
          />
          <Button
            label="Choose file (PDF, text)"
            icon="document"
            variant="secondary"
            onPress={() => void pick('file')}
          />
          <Notice icon="shield">
            Files are copied into this app’s private storage and never uploaded. Photos, PDFs and
            text files up to 15 MB.
          </Notice>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.lg, marginBottom: spacing.sm },
  choices: { gap: spacing.md },
  preview: { overflow: 'hidden', gap: 0 },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  flex: { flex: 1 },
});
