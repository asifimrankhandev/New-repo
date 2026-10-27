import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';

export interface CardProps {
  children: ReactNode;
  tone?: 'surface' | 'inverse';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, tone = 'surface', padded = true, style }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        tone === 'surface'
          ? { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
          : { backgroundColor: colors.inverseSurface },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, gap: spacing.lg },
  padded: { padding: 18 },
});
