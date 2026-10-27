import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { TextField } from '@/components/ui/text-field';
import { isIsoDate } from '@/domain/dates';
import { type EvidenceType, evidenceType } from '@/domain/enums';
import type { useForm } from '@/lib/use-form';
import { spacing } from '@/theme/tokens';

export interface EvidenceFormValues {
  evidenceType: EvidenceType | '';
  evidenceDate: string;
  note: string;
}

export const evidenceFormSchema = z.object({
  evidenceType: z.enum(evidenceType.values, { error: 'Choose what this is.' }),
  evidenceDate: z
    .string()
    .refine((value) => value === '' || isIsoDate(value), { error: 'Choose a valid date.' })
    .transform((value) => (value === '' ? null : value)),
  note: z
    .string()
    .trim()
    .max(200, { error: 'Keep the note under 200 characters.' })
    .transform((value) => (value === '' ? null : value)),
});

const TYPE_OPTIONS = evidenceType.values.map((value) => ({
  value,
  label: evidenceType.labels[value],
}));

export function EvidenceFields({ form }: { form: ReturnType<typeof useForm<EvidenceFormValues>> }) {
  const { values, errors, setField } = form;
  return (
    <View style={styles.group}>
      <ChoiceChips
        label="What is it?"
        options={TYPE_OPTIONS}
        value={values.evidenceType}
        onChange={(value) => setField('evidenceType', value)}
        error={errors.evidenceType}
      />
      <DateField
        label="Date on the document · optional"
        optional
        value={values.evidenceDate}
        onChange={(value) => setField('evidenceDate', value)}
        error={errors.evidenceDate}
        maximumDate={new Date()}
      />
      <TextField
        label="Note · optional"
        value={values.note}
        onChangeText={(value) => setField('note', value)}
        error={errors.note}
        placeholder="e.g. UPS drop-off receipt"
        maxLength={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.lg },
});
