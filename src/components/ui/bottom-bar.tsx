import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface BottomBarProps {
  children: ReactNode;
  /** Short reassurance shown above the actions. */
  note?: string;
}

/** Sticky footer for a screen's primary actions, respecting the home indicator. */
export function BottomBar({ children, note }: BottomBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        },
      ]}
    >
      {note ? (
        <AppText variant="small" tone="muted" style={styles.note}>
          {note}
        </AppText>
      ) : null}
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  note: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
