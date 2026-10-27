import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon } from './icon';

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {title ? (
        <AppText variant="label" tone="muted" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {rows.map((row, index) => (
          <View
            key={row.key ?? index}
            style={index > 0 && { borderTopWidth: 1, borderTopColor: colors.surfaceMuted }}
          >
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

export interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  tone?: 'ink' | 'danger';
  showChevron?: boolean;
  accessibilityHint?: string;
}

export function SettingsRow({
  label,
  value,
  onPress,
  tone = 'ink',
  showChevron = !!onPress,
  accessibilityHint,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      <AppText variant="body" tone={tone} style={styles.rowLabel}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="caption" tone="muted">
          {value}
        </AppText>
      ) : null}
      {showChevron ? <Icon name="chevronRight" size={16} color={colors.muted} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={value ? `${label}, ${value}` : label}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      {content}
    </Pressable>
  );
}

export interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function ToggleRow({ label, value, onValueChange, description, disabled }: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="small" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.ink }}
        thumbColor={value ? colors.accent : colors.surface}
        ios_backgroundColor={colors.line}
      />
    </View>
  );
}

export function SettingsSlot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.rowLabel}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: spacing.lg, overflow: 'hidden' },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLabel: { flex: 1 },
});
