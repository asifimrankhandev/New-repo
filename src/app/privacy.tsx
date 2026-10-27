import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TopBar } from '@/components/ui/top-bar';
import { OFFICIAL_SOURCES } from '@/domain/official-sources';
import { spacing } from '@/theme/tokens';

const SECTIONS = [
  {
    title: 'What stays on your device',
    body: 'Cases, timelines, amounts, reminders and evidence files are stored only in this app’s private storage. There is no account, no server and no analytics. RefundBeacon never connects to your inbox, bank, card or retailer accounts.',
  },
  {
    title: 'What leaves your device',
    body: 'Only what you choose to share: a case summary, a CSV export, a backup file or a message you copy. Shared files may be stored or forwarded by whoever receives them. Backups are not encrypted — keep them private.',
  },
  {
    title: 'Permissions',
    body: 'Photos and camera are used only when you add evidence. Notifications are used only for reminders you set. You can decline any of them and the rest of the app keeps working.',
  },
  {
    title: 'Deleting your data',
    body: 'Delete a single case from its menu, or everything from Settings › Delete all data. Uninstalling the app also removes all local data.',
  },
  {
    title: 'Terms',
    body: 'RefundBeacon helps you organize information you enter. It does not issue refunds, contact retailers, file disputes or give legal or financial advice, and it can’t guarantee any outcome. Next-step suggestions are general guidance based on the facts you recorded. Refund rules vary by retailer, payment method and circumstances — check the retailer’s policy and your card agreement.',
  },
] as const;

export default function PrivacyScreen() {
  return (
    <Screen header={<TopBar title="Privacy & terms" onLeadingPress={() => router.back()} />}>
      <AppText variant="title" accessibilityRole="header">
        Your data, your device.
      </AppText>
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <SectionHeader title={section.title} />
          <AppText variant="body" tone="muted">
            {section.body}
          </AppText>
        </View>
      ))}
      <View style={styles.section}>
        <SectionHeader title="Official consumer resources" />
        {Object.values(OFFICIAL_SOURCES).map((source) => (
          <Button
            key={source.url}
            label={source.label}
            variant="secondary"
            size="medium"
            accessibilityHint="Opens in your browser"
            onPress={() => void Linking.openURL(source.url)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
