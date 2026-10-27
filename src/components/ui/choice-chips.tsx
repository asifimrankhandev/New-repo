import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/use-theme';
import { fonts, radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

export interface ChoiceChipsProps<T extends string> {
  label?: string;
  options: readonly ChoiceOption<T>[];
  value: T | '';
  onChange: (value: T | '') => void;
  /** Tapping the selected chip clears it (for optional fields). */
  allowDeselect?: boolean;
  error?: string;
}

/** Single-choice chips that wrap; exposed to assistive tech as a radio group. */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  allowDeselect = false,
  error,
}: ChoiceChipsProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {label ? (
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
      ) : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.wrap}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                haptics.select();
                onChange(selected && allowDeselect ? '' : option.value);
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? colors.ink : colors.surface,
                  borderColor: selected ? colors.ink : colors.line,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <AppText
                variant="body"
                tone={selected ? 'onInk' : 'ink'}
                style={{ fontFamily: selected ? fonts.semibold : fonts.regular, fontSize: 14 }}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
