import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'inverse' | 'danger' | 'dashed';
type ButtonSize = 'large' | 'medium' | 'small';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon in the orange tile on the right of primary buttons, or inline before the label. */
  icon?: IconName;
  iconPlacement?: 'tile' | 'leading';
  loading?: boolean;
  fullWidth?: boolean;
  flex?: number;
}

const HEIGHTS: Record<ButtonSize, number> = { large: 56, medium: 46, small: 36 };
const PRESS_SPRING = { damping: 18, stiffness: 420, mass: 0.6, reduceMotion: ReduceMotion.System };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  variant = 'primary',
  size = 'large',
  icon,
  iconPlacement = 'leading',
  loading = false,
  fullWidth = false,
  flex,
  disabled,
  accessibilityHint,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const isDisabled = disabled || loading;

  const palette = {
    primary: { background: colors.ink, text: 'onInk', border: colors.ink },
    secondary: { background: 'transparent', text: 'ink', border: colors.ink },
    accent: { background: colors.accent, text: 'onAccent', border: colors.accent },
    inverse: { background: 'transparent', text: 'inverseText', border: colors.inverseLine },
    danger: { background: colors.surface, text: 'danger', border: colors.dangerBorder },
    dashed: { background: 'transparent', text: 'ink', border: colors.faint },
  } as const;
  const scheme = palette[variant];
  const showTile = icon && iconPlacement === 'tile';

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!reduceMotion) scale.set(withSpring(size === 'large' ? 0.975 : 0.96, PRESS_SPRING));
    onPressIn?.(event);
  };
  const handlePressOut = (event: GestureResponderEvent) => {
    scale.set(withSpring(1, PRESS_SPRING));
    onPressOut?.(event);
  };
  const handlePress = (event: GestureResponderEvent) => {
    if (variant === 'primary' || variant === 'accent') haptics.tap();
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      hitSlop={size === 'small' ? 4 : 0}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: scheme.background,
          borderColor: scheme.border,
          borderStyle: variant === 'dashed' ? 'dashed' : 'solid',
          borderWidth:
            variant === 'primary' || variant === 'accent' ? 0 : variant === 'dashed' ? 1.5 : 1,
          borderRadius: size === 'small' ? radius.md : radius.xl,
          justifyContent: showTile ? 'space-between' : 'center',
          paddingLeft: showTile ? spacing.xl : spacing.lg,
          paddingRight: showTile ? spacing.sm : spacing.lg,
          opacity: isDisabled ? 0.45 : 1,
        },
        fullWidth && styles.fullWidth,
        flex !== undefined && { flex },
        pressStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors[scheme.text]} />
      ) : (
        <>
          <View style={styles.content}>
            {icon && iconPlacement === 'leading' ? (
              <Icon
                name={icon}
                size={18}
                color={variant === 'primary' ? colors.accent : colors[scheme.text]}
              />
            ) : null}
            <AppText
              variant="button"
              tone={scheme.text}
              numberOfLines={1}
              style={size === 'small' ? styles.smallLabel : undefined}
            >
              {label}
            </AppText>
          </View>
          {showTile ? (
            <View style={[styles.tile, { backgroundColor: colors.accent }]}>
              <Icon name={icon} size={20} color={colors.onAccent} />
            </View>
          ) : null}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallLabel: { fontSize: 14 },
});
