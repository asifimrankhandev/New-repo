import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { fonts, radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export interface NoticeProps {
  icon?: IconName;
  title?: string;
  children: ReactNode;
  tone?: 'plain' | 'dashed' | 'surface' | 'inverse';
  action?: ReactNode;
}

/** Inline explanation: privacy promises, permission fallbacks, sensitive-data warnings. */
export function Notice({ icon = 'info', title, children, tone = 'plain', action }: NoticeProps) {
  const { colors } = useTheme();
  const inverse = tone === 'inverse';
  return (
    <View
      style={[
        styles.container,
        tone === 'dashed' && { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint },
        tone === 'surface' && {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        inverse && { backgroundColor: colors.inverseSurface },
        tone === 'plain' && styles.plain,
      ]}
    >
      <Icon
        name={icon}
        size={18}
        color={inverse ? colors.accent : colors.muted}
        style={styles.icon}
      />
      <View style={styles.body}>
        <AppText variant="caption" tone={inverse ? 'inverseMuted' : 'muted'}>
          {title ? (
            <AppText variant="caption" tone={inverse ? 'inverseText' : 'ink'} style={styles.title}>
              {`${title} `}
            </AppText>
          ) : null}
          {children}
        </AppText>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.xl,
    padding: 14,
  },
  plain: { paddingHorizontal: spacing.xs, paddingVertical: 0 },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: spacing.sm },
  title: { fontFamily: fonts.semibold },
});
