import { type Href, router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { NextStep, NextStepAction } from '@/domain/next-step';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

import { dismissNextStep } from '../case-repository';

function actionFor(step: NextStep, caseId: string): { label: string; run: () => void } | null {
  const go = (href: Href) => () => router.push(href);
  const map: Record<NextStepAction, { label: string; run: () => void } | null> = {
    'record-handoff': {
      label: 'Log hand-over',
      run: go({
        pathname: '/case/[id]/add-event',
        params: { id: caseId, type: 'item-dropped-off' },
      }),
    },
    'check-tracking': {
      label: 'Log delivery',
      run: go({ pathname: '/case/[id]/add-event', params: { id: caseId, type: 'delivered' } }),
    },
    'add-expected-date': {
      label: 'Add expected date',
      run: go({ pathname: '/case/[id]/edit', params: { id: caseId } }),
    },
    wait: {
      label: 'Set a reminder',
      run: go({ pathname: '/case/[id]/reminder', params: { id: caseId } }),
    },
    'contact-retailer': {
      label: 'Draft follow-up',
      run: go({ pathname: '/case/[id]/follow-up', params: { id: caseId } }),
    },
    'ask-remaining': {
      label: 'Draft follow-up',
      run: go({ pathname: '/case/[id]/follow-up', params: { id: caseId, request: 'remaining' } }),
    },
    'check-payment-method': {
      label: 'Record outcome',
      run: go({ pathname: '/case/[id]/outcome', params: { id: caseId } }),
    },
    'review-options': step.officialSource
      ? {
          label: 'Read the CFPB guide',
          run: () => void Linking.openURL(step.officialSource?.url ?? ''),
        }
      : null,
    none: null,
  };
  return map[step.action];
}

/** The single recommended action, with the recorded facts it relies on. */
export function NextStepCard({ step, caseId }: { step: NextStep; caseId: string }) {
  const { colors } = useTheme();
  const action = actionFor(step, caseId);
  const canDismiss = step.action !== 'none';
  return (
    <Card tone="inverse" style={styles.card}>
      <View style={styles.text}>
        <View style={styles.eyebrow}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <AppText variant="label" tone="inverseText">
            Next step
          </AppText>
        </View>
        <AppText variant="heading" tone="inverseText" accessibilityRole="header">
          {step.title}
        </AppText>
        <AppText variant="body" tone="inverseMuted">
          {step.body}
        </AppText>
      </View>
      {step.reasons.length > 0 ? (
        <View
          style={[styles.reasons, { borderTopColor: colors.inverseLine }]}
          accessible
          accessibilityLabel={`Why this step: ${step.reasons.join('. ')}`}
        >
          <AppText variant="label" tone="inverseMuted" style={styles.reasonLabel}>
            Why this step
          </AppText>
          {step.reasons.map((reason) => (
            <AppText key={reason} variant="caption" tone="inverseMuted">
              {`•  ${reason}`}
            </AppText>
          ))}
        </View>
      ) : null}
      {action || canDismiss ? (
        <View style={styles.actions}>
          {action ? (
            <Button
              label={action.label}
              variant="accent"
              size="medium"
              flex={1}
              onPress={action.run}
            />
          ) : null}
          {canDismiss ? (
            <Button
              label="Doesn’t fit"
              variant="inverse"
              size="medium"
              accessibilityHint="Hides this suggestion until the case changes"
              onPress={() => dismissNextStep(caseId, step.key)}
            />
          ) : null}
        </View>
      ) : null}
      {step.officialSource && step.action !== 'review-options' ? (
        <Button
          label={step.officialSource.label}
          variant="inverse"
          size="small"
          accessibilityHint="Opens the official guidance in your browser"
          onPress={() => void Linking.openURL(step.officialSource?.url ?? '')}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.xl },
  text: { gap: spacing.sm },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  reasons: { gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1 },
  reasonLabel: { fontSize: 10.5 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
