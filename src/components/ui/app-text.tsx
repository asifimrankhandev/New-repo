import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';
import { typography, type TypographyVariant } from '@/theme/typography';

export type TextTone = keyof Pick<
  ThemeColors,
  | 'ink'
  | 'muted'
  | 'faint'
  | 'accent'
  | 'danger'
  | 'onInk'
  | 'onAccent'
  | 'inverseText'
  | 'inverseMuted'
  | 'missingText'
>;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
}

/** Large display text caps its scaling so layouts stay intact at the largest text sizes. */
const SCALE_LIMITS: Partial<Record<TypographyVariant, number>> = {
  display: 1.2,
  title: 1.3,
  headline: 1.3,
};

export function AppText({ variant = 'body', tone = 'ink', style, ...props }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={SCALE_LIMITS[variant]}
      {...props}
      style={[typography[variant], { color: colors[tone] }, style]}
    />
  );
}
