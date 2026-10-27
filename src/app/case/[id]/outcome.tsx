import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { OptionCards } from '@/components/ui/option-cards';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TopBar } from '@/components/ui/top-bar';
import { isIsoDate, todayIso } from '@/domain/dates';
import {
  confirmationSource,
  type ConfirmationSource,
  outcomeType,
  type OutcomeType,
} from '@/domain/enums';
import type { RefundCase } from '@/domain/models';
import { centsToInput, formatCents, parseMoneyInput } from '@/domain/money';
import type { Reconciliation } from '@/domain/reconciliation';
import { MissingCase } from '@/features/cases/components/missing-case';
import { useCaseDetail } from '@/features/cases/use-case-data';
import { outcomeNeedsAmount, recordOutcome } from '@/features/outcome/outcome-service';
import { showError } from '@/lib/dialogs';
import { useForm } from '@/lib/use-form';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

const OUTCOME_OPTIONS = outcomeType.values.map((value) => ({
  value,
  title: outcomeType.labels[value],
}));
const SOURCE_OPTIONS = confirmationSource.values.map((value) => ({
  value,
  label: confirmationSource.labels[value],
}));

interface OutcomeFormValues {
  outcome: OutcomeType | '';
  amount: string;
  receivedDate: string;
  confirmationSource: ConfirmationSource | '';
  note: string;
}

const outcomeSchema = z
  .object({
    outcome: z.enum(outcomeType.values, { error: 'Choose what happened.' }),
    amount: z.string(),
    receivedDate: z.string().refine(isIsoDate, { error: 'Choose a date.' }),
    confirmationSource: z.union([z.literal(''), z.enum(confirmationSource.values)]),
    note: z
      .string()
      .trim()
      .max(300)
      .transform((value) => (value === '' ? null : value)),
  })
  .superRefine((value, ctx) => {
    if (!outcomeNeedsAmount(value.outcome)) return;
    const cents = parseMoneyInput(value.amount);
    if (cents === null || cents === 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter the amount you received.' });
    }
    if (value.confirmationSource === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmationSource'],
        message: 'Say how you confirmed it.',
      });
    }
  });

export default function OutcomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useCaseDetail(id);
  if (!detail.loaded) return <Screen>{null}</Screen>;
  if (!detail.refundCase || !detail.money) return <MissingCase />;
  return <OutcomeForm refundCase={detail.refundCase} money={detail.money} />;
}

function OutcomeForm({ refundCase, money }: { refundCase: RefundCase; money: Reconciliation }) {
  const { colors } = useTheme();
  const fmt = (cents: number) => formatCents(cents, refundCase.currencyCode);
  const [saving, setSaving] = useState(false);
  const form = useForm<OutcomeFormValues>({
    outcome: '',
    amount: '',
    receivedDate: todayIso(),
    confirmationSource: '',
    note: '',
  });
  const { values, errors, setField } = form;
  const needsAmount = values.outcome !== '' && outcomeNeedsAmount(values.outcome);
  const isCash = values.outcome === 'full-refund' || values.outcome === 'partial-refund';
  const entered = parseMoneyInput(values.amount) ?? 0;
  const cashAfter = money.cashReceivedCents + (isCash ? entered : 0);
  const remainingAfter =
    money.expectedCents === null ? null : Math.max(money.expectedCents - cashAfter, 0);

  const chooseOutcome = (outcome: OutcomeType) => {
    setField('outcome', outcome);
    if (outcome === 'full-refund' && values.amount === '') {
      const suggested = money.remainingCents ?? money.expectedCents;
      if (suggested) setField('amount', centsToInput(suggested));
    }
  };

  const save = async () => {
    const parsed = form.validate(outcomeSchema);
    if (!parsed) return;
    setSaving(true);
    try {
      await recordOutcome({
        caseId: refundCase.id,
        outcome: parsed.outcome,
        amountCents: outcomeNeedsAmount(parsed.outcome) ? parseMoneyInput(parsed.amount) : null,
        receivedDate: parsed.receivedDate,
        confirmationSource: parsed.confirmationSource || 'other',
        note: parsed.note,
      });
      router.back();
    } catch (error) {
      showError('Couldn’t record the outcome', error);
      setSaving(false);
    }
  };

  const resolves =
    values.outcome !== '' && values.outcome !== 'partial-refund' && values.outcome !== 'rejected';

  return (
    <Screen
      header={
        <TopBar
          title={`${refundCase.retailerName} · ${refundCase.itemName}`}
          leading="close"
          onLeadingPress={() => router.back()}
        />
      }
      footer={
        <BottomBar>
          <Button
            label={
              values.outcome === ''
                ? 'Save'
                : resolves
                  ? 'Save · resolve case'
                  : 'Save · keep case open'
            }
            flex={1}
            loading={saving}
            onPress={() => void save()}
          />
        </BottomBar>
      }
    >
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        What happened?
      </AppText>
      <OptionCards
        label="Outcome"
        columns={3}
        options={OUTCOME_OPTIONS}
        value={values.outcome}
        onChange={chooseOutcome}
        error={errors.outcome}
      />
      {needsAmount ? (
        <>
          <View style={styles.row}>
            <TextField
              label={
                isCash
                  ? 'Amount received'
                  : values.outcome === 'exchange'
                    ? 'Exchange value'
                    : 'Credit amount'
              }
              value={values.amount}
              onChangeText={(value) => setField('amount', value)}
              error={errors.amount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <DateField
              label="Received on"
              value={values.receivedDate}
              onChange={(value) => setField('receivedDate', value)}
              error={errors.receivedDate}
              maximumDate={new Date()}
            />
          </View>
          <ChoiceChips
            label="How did you confirm it?"
            options={SOURCE_OPTIONS}
            value={values.confirmationSource}
            onChange={(value) => setField('confirmationSource', value)}
            error={errors.confirmationSource}
          />
        </>
      ) : null}
      {values.outcome !== '' ? (
        <TextField
          label="Note · optional"
          value={values.note}
          onChangeText={(value) => setField('note', value)}
          placeholder={
            values.outcome === 'rejected' ? 'What reason did the retailer give?' : undefined
          }
          multiline
          maxLength={300}
        />
      ) : null}

      <Card>
        <View style={styles.line}>
          <AppText variant="body" tone="muted">
            Expected refund
          </AppText>
          <AppText variant="amount">
            {money.expectedCents === null ? 'Not entered' : fmt(money.expectedCents)}
          </AppText>
        </View>
        <View style={styles.line}>
          <AppText variant="body" tone="muted">
            Cash received, all entries
          </AppText>
          <AppText variant="amount">{`− ${fmt(cashAfter)}`}</AppText>
        </View>
        <View style={[styles.line, styles.total, { borderTopColor: colors.ink }]}>
          <AppText variant="bodyStrong">Not yet confirmed</AppText>
          <AppText variant="heading">
            {remainingAfter === null ? 'Unknown' : fmt(remainingAfter)}
          </AppText>
        </View>
        <AppText variant="small" tone="muted">
          Store credit and exchanges are tracked separately and never counted as cash.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: 10 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  total: { borderTopWidth: 1, paddingTop: 10 },
});
