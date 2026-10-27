import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BeaconMark } from '@/components/ui/beacon-mark';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { createSampleCase } from '@/features/cases/case-service';
import { setPreference } from '@/features/settings/preferences-repository';
import { showError } from '@/lib/dialogs';
import { useTheme } from '@/theme/use-theme';
import { fonts, spacing } from '@/theme/tokens';

const STEPS = [
  { title: 'Record the return', body: 'Retailer, item and amount in under 90 seconds.' },
  {
    title: 'Keep the evidence together',
    body: 'Receipts, labels, tracking and replies, in one case.',
  },
  { title: 'Know the next step', body: 'Every suggestion shows the facts it’s based on.' },
] as const;

export default function WelcomeScreen() {
  const { colors } = useTheme();

  const finishOnboarding = () => setPreference('onboarding-complete', true);

  const createFirstCase = () => {
    finishOnboarding();
    router.replace('/');
    router.push('/case/new');
  };

  const exploreSample = () => {
    try {
      const id = createSampleCase();
      finishOnboarding();
      router.replace('/');
      router.push({ pathname: '/case/[id]', params: { id } });
    } catch (error) {
      showError('Couldn’t create the sample case', error);
    }
  };

  return (
    <Screen
      footer={
        <BottomBar>
          <View style={styles.actions}>
            <Button
              label="Create my first case"
              icon="next"
              iconPlacement="tile"
              onPress={createFirstCase}
            />
            <Button
              label="Explore a sample case"
              variant="secondary"
              size="medium"
              onPress={exploreSample}
            />
          </View>
        </BottomBar>
      }
    >
      <View style={styles.header}>
        <BeaconMark />
      </View>
      <View style={styles.hero}>
        <AppText variant="label" tone="muted">
          For returns that haven’t been refunded
        </AppText>
        <AppText variant="display" accessibilityRole="header" style={styles.headline}>
          A clear next step for stuck refunds.
        </AppText>
      </View>
      <View style={[styles.steps, { borderTopColor: colors.line }]}>
        {STEPS.map((step, index) => (
          <View key={step.title} style={[styles.step, { borderBottomColor: colors.line }]}>
            <AppText variant="mono" tone="muted" style={styles.stepIndex}>
              {`0${index + 1}`}
            </AppText>
            <View style={styles.stepText}>
              <AppText variant="subheading">{step.title}</AppText>
              <AppText variant="caption" tone="muted">
                {step.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
      <Card>
        <AppText variant="caption" tone="muted">
          <AppText variant="caption" style={styles.strong}>
            Good to know.{' '}
          </AppText>
          RefundBeacon organizes your case. It doesn’t issue refunds, contact retailers for you, or
          guarantee an outcome. Everything stays on this device — no account, inbox or bank access.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg },
  hero: { gap: spacing.md, paddingTop: spacing.xxl },
  headline: { fontSize: 46, lineHeight: 48, letterSpacing: -2.2 },
  steps: { borderTopWidth: 1 },
  step: { flexDirection: 'row', gap: spacing.lg, paddingVertical: 14, borderBottomWidth: 1 },
  stepIndex: { paddingTop: 3, fontSize: 12 },
  stepText: { flex: 1 },
  strong: { fontFamily: fonts.semibold },
  actions: { flex: 1, gap: spacing.sm },
});
