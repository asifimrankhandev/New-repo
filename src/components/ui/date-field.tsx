import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatLongDate, formatTime, fromIsoDate, type IsoDate, toIsoDate } from '@/domain/dates';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon } from './icon';

interface BaseProps {
  label: string;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export interface DateFieldProps extends BaseProps {
  /** ISO calendar date or '' when unset. */
  value: string;
  onChange: (value: IsoDate | '') => void;
  /** Optional fields show a clear action once a date is set. */
  optional?: boolean;
  /** Share a row with siblings; omit in vertical stacks. */
  flex?: number;
}

/** Native date picker: a field that opens the dialog on Android, the compact picker on iOS. */
export function DateField({
  label,
  value,
  onChange,
  error,
  optional = false,
  minimumDate,
  maximumDate,
  flex,
}: DateFieldProps) {
  const { colors, scheme } = useTheme();
  const date = value ? fromIsoDate(value) : new Date();

  const openAndroid = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      minimumDate,
      maximumDate,
      onValueChange: (_event, selected) => onChange(toIsoDate(selected)),
    });

  return (
    <View style={[styles.container, flex !== undefined && { flex }]}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.line },
        ]}
      >
        {Platform.OS === 'ios' && value ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            themeVariant={scheme}
            accentColor={colors.accent}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_event, selected) => onChange(toIsoDate(selected))}
            accessibilityLabel={label}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ? formatLongDate(value) : 'not set'}`}
            accessibilityHint="Opens a date picker"
            onPress={
              Platform.OS === 'android' ? openAndroid : () => onChange(toIsoDate(new Date()))
            }
            style={styles.pressable}
          >
            <AppText variant="bodyLarge" tone={value ? 'ink' : 'faint'}>
              {value ? formatLongDate(value) : 'Choose date'}
            </AppText>
            <Icon name="calendar" size={18} color={colors.muted} />
          </Pressable>
        )}
        {optional && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChange('')}
            hitSlop={8}
            style={styles.clear}
          >
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export interface TimeFieldProps extends BaseProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export function TimeField({ label, hour, minute, onChange }: TimeFieldProps) {
  const { colors, scheme } = useTheme();
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  const commit = (selected: Date) => onChange(selected.getHours(), selected.getMinutes());

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        themeVariant={scheme}
        accentColor={colors.accent}
        onValueChange={(_event, selected) => commit(selected)}
        accessibilityLabel={label}
      />
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${formatTime(value)}`}
      accessibilityHint="Opens a time picker"
      onPress={() =>
        DateTimePickerAndroid.open({
          value,
          mode: 'time',
          onValueChange: (_event, selected) => commit(selected),
        })
      }
      hitSlop={8}
    >
      <AppText variant="mono">{formatTime(value)}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  field: {
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressable: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  clear: { padding: spacing.sm, marginLeft: 'auto' },
});
