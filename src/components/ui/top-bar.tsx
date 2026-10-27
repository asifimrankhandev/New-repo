import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MIN_TOUCH_TARGET, spacing } from '@/theme/tokens';

import { AppText } from './app-text';
import { IconButton } from './icon-button';

export interface TopBarProps {
  title?: string;
  leading?: 'back' | 'close' | 'none';
  onLeadingPress?: () => void;
  trailing?: ReactNode;
}

/** Compact header: back/close action, monospace context label, optional trailing action. */
export function TopBar({ title, leading = 'back', onLeadingPress, trailing }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {leading !== 'none' && onLeadingPress ? (
          <IconButton
            icon={leading === 'back' ? 'back' : 'close'}
            accessibilityLabel={leading === 'back' ? 'Back' : 'Close'}
            onPress={onLeadingPress}
          />
        ) : null}
      </View>
      {title ? (
        <AppText variant="label" numberOfLines={1} accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
      ) : (
        <View style={styles.title} />
      )}
      <View style={[styles.side, styles.trailing]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    minHeight: MIN_TOUCH_TARGET + spacing.sm,
  },
  side: { minWidth: MIN_TOUCH_TARGET, flexDirection: 'row' },
  trailing: { justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
});
