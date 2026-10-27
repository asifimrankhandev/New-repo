import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField, TimeField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SettingsGroup, SettingsSlot } from '@/components/ui/settings-group';
import { TextField } from '@/components/ui/text-field';
import { TopBar } from '@/components/ui/top-bar';
import { combineDateAndTime, isIsoDate, todayIso, toIsoDate } from '@/domain/dates';
import {
  type EventSource,
  eventSource,
  type EventType,
  eventType,
  MANUAL_EVENT_TYPES,
} from '@/domain/enums';
import type { TimelineEvent } from '@/domain/models';
import {
  addTimelineEvent,
  deleteTimelineEvent,
  getEvent,
  updateTimelineEvent,
} from '@/features/timeline/timeline-repository';
import { confirm, showError } from '@/lib/dialogs';
import { haptics } from '@/lib/haptics';
import { useForm } from '@/lib/use-form';
import { spacing } from '@/theme/tokens';

const SOURCE_OPTIONS = (
  ['user', 'retailer', 'carrier'] as const satisfies readonly ManualSource[]
).map((value) => ({
  value,
  label: value === 'user' ? 'Me' : value === 'retailer' ? 'Retailer' : 'Carrier',
}));

const TYPE_OPTIONS = MANUAL_EVENT_TYPES.map((value) => ({ value, label: eventType.labels[value] }));

type ManualSource = Exclude<EventSource, 'system'>;

function defaultSource(type: EventType): ManualSource {
  if (type === 'delivered' || type === 'carrier-scan') return 'carrier';
  if (type === 'retailer-replied' || type === 'refund-approved' || type === 'refund-initiated')
    return 'retailer';
  return 'user';
}

const eventFormSchema = z.object({
  type: z.enum(eventType.values, { error: 'Choose what happened.' }),
  date: z.string().refine(isIsoDate, { error: 'Choose a date.' }),
  source: z.enum(['user', 'retailer', 'carrier']),
  description: z
    .string()
    .trim()
    .max(500, { error: 'Keep notes under 500 characters.' })
    .transform((value) => (value === '' ? null : value)),
});

interface EventFormValues {
  type: EventType | '';
  date: string;
  hour: number;
  minute: number;
  source: ManualSource;
  description: string;
}

function initialValues(
  existing: TimelineEvent | undefined,
  presetType: EventType | undefined,
): EventFormValues {
  if (existing) {
    const at = new Date(existing.occurredAt);
    return {
      type: existing.type,
      date: toIsoDate(at),
      hour: at.getHours(),
      minute: at.getMinutes(),
      source: existing.source === 'system' ? 'user' : existing.source,
      description: existing.description ?? '',
    };
  }
  const now = new Date();
  const type = presetType ?? 'retailer-contacted';
  return {
    type,
    date: todayIso(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    source: defaultSource(type),
    description: '',
  };
}

export default function AddEventScreen() {
  const params = useLocalSearchParams<{ id: string; type?: string; eventId?: string }>();
  const [existing] = useState(() => (params.eventId ? getEvent(params.eventId) : undefined));
  const presetType = eventType.values.find((value) => value === params.type);
  const form = useForm<EventFormValues>(initialValues(existing, presetType));
  const { values, errors, setField } = form;
  const editing = !!existing;

  const save = (attachAfter: boolean) => {
    const parsed = form.validate(eventFormSchema);
    if (!parsed) return;
    const occurredAt = combineDateAndTime(parsed.date, values.hour, values.minute);
    if (occurredAt > Date.now() + 60_000) {
      Alert.alert(
        'That time is in the future',
        'Timeline events record what has already happened.',
      );
      return;
    }
    try {
      if (existing) {
        updateTimelineEvent(existing.id, {
          occurredAt,
          source: parsed.source,
          description: parsed.description,
        });
      } else {
        addTimelineEvent({
          caseId: params.id,
          type: parsed.type,
          source: parsed.source,
          occurredAt,
          description: parsed.description,
        });
      }
      haptics.success();
      if (attachAfter) {
        router.replace({ pathname: '/case/[id]/evidence/new', params: { id: params.id } });
      } else {
        router.back();
      }
    } catch (error) {
      showError('Couldn’t save the event', error);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: 'Delete this event?',
      message: 'It will be removed from the timeline. Case status isn’t changed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      deleteTimelineEvent(existing.id);
      router.back();
    }
  };

  return (
    <Screen
      header={
        <TopBar
          title={editing ? 'Edit event' : 'Add to timeline'}
          leading="close"
          onLeadingPress={() => router.back()}
        />
      }
      footer={
        <BottomBar>
          {editing ? (
            <Button label="Delete" variant="danger" onPress={() => void remove()} />
          ) : (
            <Button label="Save & attach" variant="secondary" onPress={() => save(true)} />
          )}
          <Button
            label={editing ? 'Save changes' : 'Save to timeline'}
            flex={1}
            onPress={() => save(false)}
          />
        </BottomBar>
      }
    >
      {editing && values.type ? (
        <View style={styles.title}>
          <AppText variant="label" tone="muted">
            {eventSource.labels[existing.source]}
          </AppText>
          <AppText variant="headline" accessibilityRole="header">
            {eventType.labels[values.type]}
          </AppText>
        </View>
      ) : (
        <ChoiceChips
          label="What happened"
          options={TYPE_OPTIONS}
          value={values.type}
          error={errors.type}
          onChange={(value) => {
            setField('type', value);
            if (value) setField('source', defaultSource(value));
          }}
        />
      )}
      <View style={styles.row}>
        <DateField
          label="Date"
          flex={1}
          value={values.date}
          onChange={(value) => setField('date', value)}
          error={errors.date}
          maximumDate={new Date()}
        />
      </View>
      <SettingsGroup>
        <SettingsSlot label="Time">
          <TimeField
            label="Time"
            hour={values.hour}
            minute={values.minute}
            onChange={(hour, minute) => {
              setField('hour', hour);
              setField('minute', minute);
            }}
          />
        </SettingsSlot>
      </SettingsGroup>
      <View style={styles.group}>
        <AppText variant="label" tone="muted">
          Reported by
        </AppText>
        <SegmentedControl
          accessibilityLabel="Reported by"
          options={SOURCE_OPTIONS}
          value={values.source}
          onChange={(value) => setField('source', value)}
        />
      </View>
      <TextField
        label="Note · optional"
        value={values.description}
        onChangeText={(value) => setField('description', value)}
        error={errors.description}
        placeholder="e.g. Chatted with support, ticket #48812"
        multiline
        maxLength={500}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.xs, paddingTop: spacing.sm },
  row: { flexDirection: 'row' },
  group: { gap: spacing.sm },
});
