import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface OptionCard<T extends string> {
  value: T;
  title: string;
  hint?: string;
}

export interface OptionCardsProps<T extends string> {
  label: string;
  options: readonly OptionCard<T>[];
  value: T | '';
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
  error?: string;
}

/** Larger radio choices with a supporting hint, laid out in a grid. */
export function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
  error,
}: OptionCardsProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.grid}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityHint={option.hint}
              onPress={() => {
                if (!selected) haptics.select();
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  flexBasis: `${100 / columns - 3}%`,
                  backgroundColor: selected && columns === 3 ? colors.ink : colors.surface,
                  borderColor: selected ? colors.ink : colors.line,
                  borderWidth: selected ? 1.5 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                variant="bodyStrong"
                tone={selected && columns === 3 ? 'onInk' : 'ink'}
                style={columns === 3 ? styles.compactTitle : undefined}
              >
                {option.title}
              </AppText>
              {option.hint ? (
                <AppText variant="small" tone="muted">
                  {option.hint}
                </AppText>
              ) : null}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    flexGrow: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  compactTitle: { fontSize: 13.5, textAlign: 'center' },
});
