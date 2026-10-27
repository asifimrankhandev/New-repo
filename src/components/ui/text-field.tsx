import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { fonts, radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'onChange'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  helper?: string;
  monospace?: boolean;
  multiline?: boolean;
  /** Fixed text before the value, e.g. "$" for amounts. */
  prefix?: string;
  /** Share a row with siblings; omit in vertical stacks. */
  flex?: number;
}

export function TextField({
  label,
  error,
  helper,
  monospace = false,
  multiline = false,
  prefix,
  flex,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.ink : colors.line;
  const fontSize = monospace ? 15 : 17;

  return (
    <View style={[styles.container, flex !== undefined && { flex }]}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
          },
          multiline && styles.multiline,
        ]}
      >
        {prefix ? (
          <AppText
            variant="bodyLarge"
            tone={props.value ? 'ink' : 'faint'}
            style={[styles.prefix, { fontSize }]}
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          cursorColor={colors.ink}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              color: colors.ink,
              fontFamily: monospace ? fonts.mono : fonts.regular,
              fontSize,
              fontVariant: prefix ? ['tabular-nums'] : undefined,
            },
            multiline && styles.multilineInput,
          ]}
          {...props}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  field: {
    minHeight: 54,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: { marginRight: 2 },
  input: { flex: 1, minHeight: 52, paddingVertical: 0 },
  multiline: { minHeight: 96, alignItems: 'stretch' },
  multilineInput: { minHeight: 96, paddingTop: spacing.md, paddingBottom: spacing.md },
});
