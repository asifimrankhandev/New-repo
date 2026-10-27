import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

import { Icon, type IconName } from './icon';

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only controls must be named for screen readers. */
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'ink' | 'inverse';
  disabled?: boolean;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'ink',
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Icon name={icon} size={22} color={tone === 'ink' ? colors.ink : colors.inverseText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
