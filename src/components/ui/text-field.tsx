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
}

export function TextField({
  label,
  error,
  helper,
  monospace = false,
  multiline = false,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.ink : colors.line;

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="muted" nativeID={`${label}-label`}>
        {label}
      </AppText>
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
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            fontFamily: monospace ? fonts.mono : fonts.regular,
            fontSize: monospace ? 15 : 17,
          },
          multiline && styles.multiline,
        ]}
        {...props}
      />
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
  container: { gap: 6, flex: 1 },
  input: {
    minHeight: 54,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  multiline: { minHeight: 96, paddingTop: spacing.md, paddingBottom: spacing.md },
});
