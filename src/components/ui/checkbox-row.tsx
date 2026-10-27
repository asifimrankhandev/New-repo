import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon } from './icon';

export function Checkbox({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.box,
        checked ? { backgroundColor: colors.ink } : { borderWidth: 1.5, borderColor: colors.faint },
      ]}
    >
      {checked ? <Icon name="check" size={13} color={colors.onInk} /> : null}
    </View>
  );
}

export interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function CheckboxRow({ label, checked, onChange, description }: CheckboxRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <Checkbox checked={checked} />
      <View style={styles.text}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="small" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  text: { flex: 1 },
});
