import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface SectionHeaderProps {
  title: string;
  /** Optional index, rendered as "01 — Title". */
  index?: number;
  trailing?: ReactNode;
}

export function SectionHeader({ title, index, trailing }: SectionHeaderProps) {
  const { colors } = useTheme();
  const text = index === undefined ? title : `${index.toString().padStart(2, '0')} — ${title}`;
  return (
    <View style={styles.row}>
      <AppText variant="label" accessibilityRole="header">
        {text}
      </AppText>
      <View style={[styles.rule, { backgroundColor: colors.line }]} />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
});
