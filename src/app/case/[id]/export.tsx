import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SettingsGroup, SettingsRow, ToggleRow } from '@/components/ui/settings-group';
import { TopBar } from '@/components/ui/top-bar';
import type { SummaryOptions } from '@/domain/case-summary';
import { MissingCase } from '@/features/cases/components/missing-case';
import { useCaseDetail } from '@/features/cases/use-case-data';
import { renderSummary, shareSummary, type SummaryFormat } from '@/features/export/export-service';
import { showError } from '@/lib/dialogs';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';

export default function ExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useCaseDetail(id);
  const { colors } = useTheme();
  const [format, setFormat] = useState<SummaryFormat>('text');
  const [options, setOptions] = useState<SummaryOptions>({
    includeTimeline: true,
    includeOrderReference: true,
    includeNotes: false,
  });
  const [sharing, setSharing] = useState(false);

  const included = detail.evidence.filter((item) => item.includeInExport);
  const input = detail.refundCase
    ? {
        refundCase: detail.refundCase,
        events: detail.events,
        entries: detail.entries,
        evidence: included,
        options,
        generatedAt: new Date(),
      }
    : null;

  if (!detail.loaded) return <Screen>{null}</Screen>;
  if (!input) return <MissingCase />;

  // The preview is exactly what will be shared.
  const preview = renderSummary(input, format);
  const toggle = (key: keyof SummaryOptions) => (value: boolean) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const share = async () => {
    setSharing(true);
    try {
      await shareSummary(input, format);
    } catch (error) {
      showError('Couldn’t share the summary', error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen
      header={<TopBar title="Case summary" leading="close" onLeadingPress={() => router.back()} />}
      footer={
        <BottomBar note="Files you share may be stored or forwarded by whoever receives them.">
          <Button
            label="Share summary"
            icon="share"
            flex={1}
            loading={sharing}
            onPress={() => void share()}
          />
        </BottomBar>
      }
    >
      <SegmentedControl
        accessibilityLabel="Format"
        value={format}
        onChange={setFormat}
        options={[
          { value: 'text', label: 'Text' },
          { value: 'csv', label: 'CSV' },
        ]}
      />
      <View
        style={[styles.paper, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityLabel="Summary preview"
      >
        <ScrollView nestedScrollEnabled horizontal={format === 'csv'}>
          <AppText variant="mono" style={styles.previewText} selectable>
            {preview}
          </AppText>
        </ScrollView>
      </View>
      <SettingsGroup title="Include">
        <ToggleRow
          label="Timeline"
          value={options.includeTimeline}
          onValueChange={toggle('includeTimeline')}
        />
        <ToggleRow
          label="Order number"
          value={options.includeOrderReference}
          onValueChange={toggle('includeOrderReference')}
        />
        <ToggleRow
          label="Private notes"
          value={options.includeNotes}
          onValueChange={toggle('includeNotes')}
        />
        <SettingsRow
          label="Evidence listed"
          value={`${included.length} of ${detail.evidence.length}`}
          onPress={() => router.push({ pathname: '/case/[id]/evidence', params: { id } })}
          accessibilityHint="Choose which evidence files appear in the summary"
        />
      </SettingsGroup>
      <AppText variant="small" tone="muted">
        The summary lists your evidence by name. Share individual files from the evidence viewer.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paper: { height: 320, borderRadius: radius.sm, borderWidth: 1, padding: spacing.lg },
  previewText: { fontSize: 11, lineHeight: 17 },
});
