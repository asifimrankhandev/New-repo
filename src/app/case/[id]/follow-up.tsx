import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxRow } from '@/components/ui/checkbox-row';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import {
  buildFollowUpDraft,
  type FollowUpRequest,
  type FollowUpTone,
} from '@/domain/follow-up-template';
import { MissingCase } from '@/features/cases/components/missing-case';
import { useCaseDetail } from '@/features/cases/use-case-data';
import { addTimelineEvent } from '@/features/timeline/timeline-repository';
import { showError } from '@/lib/dialogs';
import { useTheme } from '@/theme/use-theme';
import { fonts, radius, spacing } from '@/theme/tokens';

const TONES = [
  { value: 'polite' as const, label: 'Polite' },
  { value: 'concise' as const, label: 'Concise' },
  { value: 'firm' as const, label: 'Firm' },
];

export default function FollowUpScreen() {
  const params = useLocalSearchParams<{ id: string; request?: string }>();
  const detail = useCaseDetail(params.id);
  const { colors } = useTheme();
  const [tone, setTone] = useState<FollowUpTone>('polite');
  const [request, setRequest] = useState<FollowUpRequest>(
    params.request === 'remaining' ? 'remaining' : 'status',
  );
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [logAfterSend, setLogAfterSend] = useState(true);
  const [logged, setLogged] = useState(false);

  const draft = useMemo(
    () =>
      detail.refundCase
        ? buildFollowUpDraft({
            refundCase: detail.refundCase,
            events: detail.events,
            entries: detail.entries,
            evidenceCount: detail.evidence.length,
            tone,
            request,
          })
        : null,
    [detail.refundCase, detail.events, detail.entries, detail.evidence.length, tone, request],
  );

  if (!detail.loaded) return <Screen>{null}</Screen>;
  if (!detail.refundCase || !draft) return <MissingCase />;

  const body = editedBody ?? draft.body;
  const fullText = `${draft.subject}\n\n${body}`;
  const hasPartial =
    (detail.money?.cashReceivedCents ?? 0) > 0 && detail.money?.expectedCents !== null;

  const logContact = () => {
    if (!logAfterSend || logged) return;
    addTimelineEvent({
      caseId: params.id,
      type: 'retailer-contacted',
      source: 'user',
      occurredAt: Date.now(),
      description: `Follow-up message (${tone})`,
    });
    setLogged(true);
  };

  const copy = async () => {
    await Clipboard.setStringAsync(fullText);
    logContact();
    Alert.alert('Copied', 'Paste it into the retailer’s email, chat or contact form.');
  };

  const share = async () => {
    try {
      const result = await Share.share({ message: fullText, title: draft.subject });
      if (result.action === Share.sharedAction) logContact();
    } catch (error) {
      showError('Couldn’t open the share sheet', error);
    }
  };

  return (
    <Screen
      header={
        <TopBar
          title="Follow-up draft"
          leading="close"
          onLeadingPress={() => router.back()}
          trailing={
            <Button
              label={editedBody === null ? 'Edit' : 'Reset'}
              variant="secondary"
              size="small"
              accessibilityHint={
                editedBody === null ? 'Edit the message text' : 'Discard your edits'
              }
              onPress={() => setEditedBody(editedBody === null ? draft.body : null)}
            />
          }
        />
      }
      footer={
        <BottomBar note="Review before sending. RefundBeacon never sends messages for you.">
          <Button label="Copy" variant="secondary" flex={1} onPress={() => void copy()} />
          <Button label="Share" icon="share" flex={1.4} onPress={() => void share()} />
        </BottomBar>
      }
    >
      <SegmentedControl accessibilityLabel="Tone" options={TONES} value={tone} onChange={setTone} />
      {hasPartial ? (
        <SegmentedControl
          accessibilityLabel="Ask about"
          value={request}
          onChange={setRequest}
          options={[
            { value: 'status', label: 'Refund status' },
            { value: 'remaining', label: 'Remaining balance' },
          ]}
        />
      ) : null}

      <Card>
        <AppText
          variant="label"
          tone="muted"
          style={[styles.subject, { borderBottomColor: colors.surfaceMuted }]}
        >
          {`Subject · ${draft.subject}`}
        </AppText>
        {editedBody !== null ? (
          <TextInput
            multiline
            value={editedBody}
            onChangeText={setEditedBody}
            accessibilityLabel="Message text"
            textAlignVertical="top"
            selectionColor={colors.accent}
            style={[styles.editor, { color: colors.ink }]}
          />
        ) : (
          <AppText variant="body" style={styles.message} accessibilityLabel={body}>
            {draft.segments.map((segment, index) => (
              <AppText
                key={index}
                variant="body"
                tone={segment.kind === 'missing' ? 'missingText' : 'ink'}
                style={[
                  styles.message,
                  segment.kind === 'fact' && { backgroundColor: colors.surfaceMuted },
                  segment.kind === 'missing' && {
                    backgroundColor: colors.missingBackground,
                    fontFamily: fonts.semibold,
                  },
                ]}
              >
                {segment.text}
              </AppText>
            ))}
          </AppText>
        )}
      </Card>

      {editedBody === null ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.line },
              ]}
            />
            <AppText variant="small" tone="muted">
              From your case
            </AppText>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: colors.missingBackground,
                  borderColor: colors.missingBackground,
                },
              ]}
            />
            <AppText variant="small" tone="muted">
              Missing — fill in or remove
            </AppText>
          </View>
        </View>
      ) : null}

      {draft.missing.length > 0 ? (
        <Notice icon="info" tone="surface" title="Some facts are missing.">
          {`Add ${draft.missing.join(', ')} to the case, or edit the message before sending.`}
        </Notice>
      ) : null}

      <CheckboxRow
        label="Log “Contacted retailer” to the timeline when I copy or share"
        checked={logAfterSend}
        onChange={setLogAfterSend}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subject: { paddingBottom: 10, borderBottomWidth: 1 },
  message: { fontSize: 15.5, lineHeight: 24 },
  editor: { minHeight: 260, fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 24, padding: 0 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: radius.sm / 2, borderWidth: 1 },
});
