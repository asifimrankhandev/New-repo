import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { usePreferences } from '@/features/settings/preferences-repository';
import { useTheme } from '@/theme/use-theme';
import { fonts } from '@/theme/tokens';

export default function TabsLayout() {
  const { colors } = useTheme();
  const preferences = usePreferences();

  if (!preferences['onboarding-complete']) return <Redirect href="/welcome" />;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.ink}
      iconColor={{ default: colors.muted, selected: colors.ink }}
      indicatorColor={colors.surfaceMuted}
      labelStyle={{
        default: { color: colors.muted, fontFamily: fonts.medium },
        selected: { color: colors.ink, fontFamily: fonts.semibold },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="rectangle.stack" md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reminders">
        <NativeTabs.Trigger.Label>Reminders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock" md="schedule" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="archive">
        <NativeTabs.Trigger.Label>Archive</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="archivebox" md="archive" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
