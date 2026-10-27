import { router } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';

/** Shown when a route points at a case that no longer exists (deleted or restored over). */
export function MissingCase() {
  return (
    <Screen header={<TopBar leading="back" onLeadingPress={() => router.back()} />}>
      <AppText variant="headline" accessibilityRole="header">
        This case isn’t available
      </AppText>
      <AppText variant="body" tone="muted">
        It may have been deleted, or replaced when a backup was restored.
      </AppText>
    </Screen>
  );
}
