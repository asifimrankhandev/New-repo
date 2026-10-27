import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { fonts, radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface StatusTagProps {
  label: string;
  tone?: 'accent' | 'neutral' | 'outline';
}

export function StatusTag({ label, tone = 'neutral' }: StatusTagProps) {
  const { colors } = useTheme();
  const background =
    tone === 'accent' ? colors.accent : tone === 'neutral' ? colors.surfaceMuted : 'transparent';
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: background },
        tone === 'outline' && { borderWidth: 1, borderColor: colors.line },
      ]}
    >
      <AppText
        variant={tone === 'outline' ? 'label' : 'caption'}
        tone={tone === 'accent' ? 'onAccent' : tone === 'outline' ? 'muted' : 'ink'}
        style={tone === 'outline' ? styles.outlineText : styles.text}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    justifyContent: 'center',
  },
  text: { fontSize: 12.5, fontFamily: fonts.semibold },
  outlineText: { fontSize: 10, letterSpacing: 0.8, paddingVertical: spacing.xxs },
});
