import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface Stat {
  label: string;
  value: string;
  accessibilityValue?: string;
}

/** Hairline-ruled row of label/value pairs. */
export function StatGrid({
  stats,
  size = 'medium',
}: {
  stats: readonly Stat[];
  size?: 'medium' | 'large';
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderColor: colors.line }]}>
      {stats.map((stat, index) => (
        <View
          key={stat.label}
          accessible
          accessibilityLabel={`${stat.label}: ${stat.accessibilityValue ?? stat.value}`}
          style={[
            styles.cell,
            index > 0 && styles.notFirst,
            index < stats.length - 1 && {
              borderRightWidth: 1,
              borderRightColor: colors.line,
              paddingRight: spacing.md,
            },
          ]}
        >
          <AppText variant="label" tone="muted" style={styles.label} numberOfLines={1}>
            {stat.label}
          </AppText>
          <AppText
            variant="amount"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={size === 'large' && styles.large}
          >
            {stat.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1 },
  cell: { flex: 1, paddingVertical: spacing.md, gap: 2 },
  notFirst: { paddingLeft: spacing.md },
  label: { fontSize: 10.5, letterSpacing: 1 },
  large: { fontSize: 20, lineHeight: 26 },
});
