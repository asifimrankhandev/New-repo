import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { OptionCards } from '@/components/ui/option-cards';
import { TextField } from '@/components/ui/text-field';
import { type CaseFormValues, NOTES_MAX_LENGTH } from '@/domain/case-input';
import { dateSource, dateSourceHints, paymentType, returnMethod } from '@/domain/enums';
import { centsToInput, formatCents, parseMoneyInput } from '@/domain/money';
import type { useForm } from '@/lib/use-form';
import { spacing } from '@/theme/tokens';

type CaseForm = ReturnType<typeof useForm<CaseFormValues>>;

const toOptions = <T extends string>(source: { values: readonly T[]; labels: Record<T, string> }) =>
  source.values.map((value) => ({ value, label: source.labels[value] }));

const PAYMENT_OPTIONS = toOptions(paymentType);
const RETURN_METHOD_OPTIONS = toOptions(returnMethod);
const DATE_SOURCE_OPTIONS = dateSource.values.map((value) => ({
  value,
  title: dateSource.labels[value],
  hint: dateSourceHints[value],
}));

export function WhatFields({ form }: { form: CaseForm }) {
  const { values, errors, setField } = form;
  return (
    <View style={styles.group}>
      <TextField
        label="Retailer"
        value={values.retailerName}
        onChangeText={(value) => setField('retailerName', value)}
        error={errors.retailerName}
        autoCapitalize="words"
        textContentType="organizationName"
        returnKeyType="next"
      />
      <TextField
        label="Item"
        value={values.itemName}
        onChangeText={(value) => setField('itemName', value)}
        error={errors.itemName}
        returnKeyType="next"
      />
      <View style={styles.row}>
        <TextField
          label="Amount paid"
          value={values.purchaseAmount}
          onChangeText={(value) => setField('purchaseAmount', value)}
          error={errors.purchaseAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          prefix="$"
          flex={1}
        />
        <DateField
          label="Order date"
          flex={1}
          optional
          value={values.purchaseDate}
          onChange={(value) => setField('purchaseDate', value)}
          error={errors.purchaseDate}
          maximumDate={new Date()}
        />
      </View>
      <TextField
        label="Order number · optional"
        value={values.orderReference}
        onChangeText={(value) => setField('orderReference', value)}
        error={errors.orderReference}
        helper="Never enter passwords or full card numbers."
        monospace
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <ChoiceChips
        label="Paid with · optional"
        options={PAYMENT_OPTIONS}
        value={values.paymentType as (typeof PAYMENT_OPTIONS)[number]['value'] | ''}
        onChange={(value) => setField('paymentType', value)}
        allowDeselect
      />
    </View>
  );
}

export function ReturnFields({ form }: { form: CaseForm }) {
  const { values, errors, setField } = form;
  const shipped = values.returnMethod !== 'in-store' && values.returnMethod !== 'cancellation';
  return (
    <View style={styles.group}>
      <ChoiceChips
        label="Return method"
        options={RETURN_METHOD_OPTIONS}
        value={values.returnMethod as (typeof RETURN_METHOD_OPTIONS)[number]['value'] | ''}
        onChange={(value) => setField('returnMethod', value)}
        allowDeselect
      />
      <DateField
        label="Handed over on"
        optional
        value={values.handoffDate}
        onChange={(value) => setField('handoffDate', value)}
        error={errors.handoffDate}
        maximumDate={new Date()}
      />
      {shipped ? (
        <>
          <TextField
            label="Carrier · optional"
            value={values.carrierName}
            onChangeText={(value) => setField('carrierName', value)}
            error={errors.carrierName}
            placeholder="UPS, USPS, FedEx…"
          />
          <TextField
            label="Tracking number or link · optional"
            value={values.trackingReference}
            onChangeText={(value) => setField('trackingReference', value)}
            error={errors.trackingReference}
            monospace
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      ) : null}
    </View>
  );
}

export function RefundFields({ form }: { form: CaseForm }) {
  const { values, errors, setField } = form;
  const purchaseCents = parseMoneyInput(values.purchaseAmount);
  const canCopyPurchase =
    purchaseCents !== null && values.expectedRefundAmount !== centsToInput(purchaseCents);
  return (
    <View style={styles.group}>
      <View style={styles.inline}>
        <TextField
          label="Expected refund · optional"
          value={values.expectedRefundAmount}
          onChangeText={(value) => setField('expectedRefundAmount', value)}
          error={errors.expectedRefundAmount}
          keyboardType="decimal-pad"
          placeholder="Leave blank if unsure"
          prefix="$"
        />
        {canCopyPurchase ? (
          <Button
            label={`Use amount paid (${formatCents(purchaseCents)})`}
            variant="secondary"
            size="small"
            accessibilityHint="Only use this if you confirmed the refund matches what you paid"
            onPress={() => setField('expectedRefundAmount', centsToInput(purchaseCents))}
          />
        ) : null}
      </View>
      <DateField
        label="Expected by · optional"
        optional
        value={values.expectedRefundDate}
        onChange={(value) => setField('expectedRefundDate', value)}
        error={errors.expectedRefundDate}
      />
      {values.expectedRefundDate ? (
        <>
          <OptionCards
            label="Where does this date come from?"
            options={DATE_SOURCE_OPTIONS.filter((option) => option.value !== 'other')}
            value={
              values.expectedRefundSource as (typeof DATE_SOURCE_OPTIONS)[number]['value'] | ''
            }
            onChange={(value) => setField('expectedRefundSource', value)}
            error={errors.expectedRefundSource}
          />
          <TextField
            label="Source detail · optional"
            value={values.expectedRefundSourceNote}
            onChangeText={(value) => setField('expectedRefundSourceNote', value)}
            error={errors.expectedRefundSourceNote}
            placeholder="e.g. support chat on Oct 14"
          />
        </>
      ) : null}
    </View>
  );
}

export function NotesField({ form }: { form: CaseForm }) {
  return (
    <TextField
      label="Notes · optional"
      value={form.values.notes}
      onChangeText={(value) => form.setField('notes', value)}
      error={form.errors.notes}
      multiline
      maxLength={NOTES_MAX_LENGTH}
    />
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: 10 },
  inline: { gap: spacing.sm },
});
