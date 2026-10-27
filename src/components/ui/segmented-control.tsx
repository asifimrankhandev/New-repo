import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/use-theme';
import { fonts, radius } from '@/theme/tokens';

import { AppText } from './app-text';
import type { ChoiceOption } from './choice-chips';

export interface SegmentedControlProps<T extends string> {
  accessibilityLabel: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: colors.segmentTrack }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              if (!selected) haptics.select();
              onChange(option.value);
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.surface },
              selected && styles.shadow,
            ]}
          >
            <AppText
              variant="body"
              tone={selected ? 'ink' : 'muted'}
              style={{ fontSize: 14, fontFamily: selected ? fonts.semibold : fonts.regular }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.08)',
  },
});
