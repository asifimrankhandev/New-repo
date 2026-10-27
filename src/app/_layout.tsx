import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { InterTight_400Regular } from '@expo-google-fonts/inter-tight/400Regular';
import { InterTight_500Medium } from '@expo-google-fonts/inter-tight/500Medium';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  type ErrorBoundaryProps,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { AppLifecycle } from '@/features/app/app-lifecycle';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  const migration = useMigrations(db, migrations);
  // Fonts failing to load falls back to system fonts; a failed migration blocks the app.
  const ready = (fontsLoaded || !!fontError) && (migration.success || !!migration.error);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>{migration.error ? <DatabaseError /> : <AppNavigator />}</SafeAreaProvider>
  );
}

function AppNavigator() {
  const { scheme, colors } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.ink,
        background: colors.background,
        card: colors.background,
        text: colors.ink,
        border: colors.line,
        notification: colors.accent,
      },
    };
  }, [scheme, colors]);

  return (
    <ThemeProvider value={navigationTheme}>
      <AppLifecycle />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="case/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/index" />
        <Stack.Screen name="case/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/add-event" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/evidence/index" />
        <Stack.Screen name="case/[id]/evidence/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/evidence/[evidenceId]" />
        <Stack.Screen name="case/[id]/follow-up" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/reminder" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/outcome" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/export" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

/** Route-level crash screen: keeps the user's data safe and offers a retry. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.background }]}>
      <AppText variant="headline" accessibilityRole="header">
        Something went wrong
      </AppText>
      <AppText variant="body" tone="muted">
        This screen hit an unexpected problem. Your cases are stored safely on this device.
      </AppText>
      <Button label="Try again" onPress={() => void retry()} />
    </View>
  );
}

function DatabaseError() {
  const { colors } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.background }]}>
      <AppText variant="headline">Your data couldn’t be opened</AppText>
      <AppText variant="body" tone="muted">
        RefundBeacon couldn’t update its local database. Your cases haven’t been deleted. Please
        restart the app; if this keeps happening, contact support from the app store listing.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
});
