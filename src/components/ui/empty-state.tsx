import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { borderColor: colors.line }]}>
      <AppText variant="subheading">{title}</AppText>
      <AppText variant="body" tone="muted">
        {body}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
