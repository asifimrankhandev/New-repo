import { router, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { OptionCards } from '@/components/ui/option-cards';
import { Screen } from '@/components/ui/screen';
import { SegmentBar } from '@/components/ui/segment-bar';
import { TopBar } from '@/components/ui/top-bar';
import {
  type CaseFormValues,
  caseInputSchema,
  EMPTY_CASE_FORM,
  refundStepSchema,
  returnStepSchema,
  whatStepSchema,
} from '@/domain/case-input';
import {
  addDaysIso,
  combineDateAndTime,
  formatLongDate,
  formatWeekdayDate,
  todayIso,
} from '@/domain/dates';
import { findLikelyDuplicates } from '@/domain/duplicates';
import { createCase, getAllCases } from '@/features/cases/case-repository';
import {
  NotesField,
  RefundFields,
  ReturnFields,
  WhatFields,
} from '@/features/cases/components/case-form-fields';
import { requestNotificationPermission } from '@/features/reminders/notification-service';
import { createReminder } from '@/features/reminders/reminder-repository';
import { usePreferences } from '@/features/settings/preferences-repository';
import { confirm, showError } from '@/lib/dialogs';
import { haptics } from '@/lib/haptics';
import { useForm } from '@/lib/use-form';
import { spacing } from '@/theme/tokens';

const STEPS = [
  { title: 'What are you returning?', schema: whatStepSchema },
  { title: 'How did you return it?', schema: returnStepSchema },
  { title: 'What refund do you expect?', schema: refundStepSchema },
  { title: 'Want a reminder?', schema: null },
] as const;

type ReminderChoice = 'none' | 'expected' | 'in-3-days' | 'in-1-week';

function reminderDate(choice: ReminderChoice, values: CaseFormValues): string | null {
  const today = todayIso();
  switch (choice) {
    case 'none':
      return null;
    case 'expected':
      return values.expectedRefundDate && values.expectedRefundDate > today
        ? addDaysIso(values.expectedRefundDate, 1)
        : null;
    case 'in-3-days':
      return addDaysIso(today, 3);
    case 'in-1-week':
      return addDaysIso(today, 7);
  }
}

export default function NewCaseScreen() {
  const form = useForm<CaseFormValues>(EMPTY_CASE_FORM);
  const preferences = usePreferences();
  const [step, setStep] = useState(0);
  const [reminderChoice, setReminderChoice] = useState<ReminderChoice>('none');
  const [saving, setSaving] = useState(false);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState<string | null>(null);
  const current = STEPS[step] ?? STEPS[0];
  const isLast = step === STEPS.length - 1;

  const validateCurrent = () => (current.schema ? form.validate(current.schema) !== null : true);

  const navigation = useNavigation();
  const dirty = Object.values(form.values).some((value) => value !== '');
  /** Set right before an intentional exit (save, view existing) so it isn't intercepted. */
  const leavingRef = useRef(false);

  // Swipe-down, the close button and Android back all go through here: never lose input silently.
  usePreventRemove(dirty, ({ data }) => {
    if (leavingRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    void confirm({
      title: 'Discard this case?',
      message: 'Nothing has been saved yet.',
      confirmLabel: 'Discard',
      destructive: true,
    }).then((discard) => {
      if (discard) navigation.dispatch(data.action);
    });
  });

  // Android back steps backwards through the wizard before leaving it.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const save = async () => {
    // The first step is the only required one; later steps may still be empty.
    if (form.validate(whatStepSchema) === null) {
      setStep(0);
      return;
    }
    const input = form.validate(caseInputSchema);
    if (!input) return;
    setSaving(true);
    try {
      const id = createCase(input);
      const date = reminderDate(reminderChoice, form.values);
      if (date) {
        await requestNotificationPermission();
        await createReminder({
          caseId: id,
          type: reminderChoice === 'expected' ? 'check-refund' : 'follow-up',
          scheduledAt: combineDateAndTime(
            date,
            preferences['reminder-hour'],
            preferences['reminder-minute'],
          ),
        });
      }
      haptics.success();
      // Close the modal flow first so Back from the new case returns to the list.
      leavingRef.current = true;
      router.dismiss();
      router.push({ pathname: '/case/[id]', params: { id } });
    } catch (error) {
      showError('Couldn’t save the case', error);
      setSaving(false);
    }
  };

  /** Warns once per retailer/item/order combination; the user can still create the case. */
  const confirmNotDuplicate = async (): Promise<boolean> => {
    const { retailerName, itemName, orderReference } = form.values;
    const key = [retailerName, itemName, orderReference].join('|');
    if (key === acknowledgedDuplicate) return true;
    const matches = findLikelyDuplicates(
      { retailerName, itemName, orderReference: orderReference || null },
      getAllCases(),
    );
    const match = matches[0];
    if (!match) return true;
    const choice = await new Promise<'continue' | 'view' | 'cancel'>((resolve) =>
      Alert.alert(
        'You may already have this case',
        `“${match.itemName}” from ${match.retailerName} was added ${formatLongDate(new Date(match.createdAt))}${match.archivedAt ? ' and is archived' : ''}.`,
        [
          { text: 'View existing', onPress: () => resolve('view') },
          { text: 'Create anyway', onPress: () => resolve('continue') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
        ],
        { cancelable: true, onDismiss: () => resolve('cancel') },
      ),
    );
    if (choice === 'view') {
      leavingRef.current = true;
      router.dismiss();
      router.push({ pathname: '/case/[id]', params: { id: match.id } });
    }
    if (choice === 'continue') setAcknowledgedDuplicate(key);
    return choice === 'continue';
  };

  const next = async () => {
    if (!validateCurrent()) return;
    if (step === 0 && !(await confirmNotDuplicate())) return;
    if (isLast) void save();
    else setStep(step + 1);
  };

  const expectedReminder = reminderDate('expected', form.values);
  const reminderOptions = [
    { value: 'none' as const, title: 'No reminder', hint: 'You can add one later' },
    ...(expectedReminder
      ? [
          {
            value: 'expected' as const,
            title: 'Day after expected date',
            hint: formatWeekdayDate(expectedReminder),
          },
        ]
      : []),
    {
      value: 'in-3-days' as const,
      title: 'In 3 days',
      hint: formatWeekdayDate(addDaysIso(todayIso(), 3)),
    },
    {
      value: 'in-1-week' as const,
      title: 'In 1 week',
      hint: formatWeekdayDate(addDaysIso(todayIso(), 7)),
    },
  ];

  return (
    <Screen
      edges={['top']}
      header={
        <View>
          <TopBar
            title={`New case — ${step + 1} / ${STEPS.length}`}
            leading={step === 0 ? 'close' : 'back'}
            onLeadingPress={goBack}
            trailing={
              step > 0 && !isLast ? (
                <Button
                  label="Skip"
                  variant="secondary"
                  size="small"
                  onPress={() => setStep(step + 1)}
                />
              ) : undefined
            }
          />
          <View style={styles.progress}>
            <SegmentBar
              total={STEPS.length}
              filled={step + 1}
              height={3}
              accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}
            />
          </View>
        </View>
      }
      footer={
        <BottomBar>
          {step > 0 && !isLast ? (
            <Button
              label="Save, add later"
              variant="secondary"
              loading={saving}
              onPress={() => void save()}
            />
          ) : null}
          <Button
            label={isLast ? 'Save case' : step === 2 ? 'Continue to reminder' : 'Continue'}
            icon={isLast ? 'check' : 'next'}
            iconPlacement="tile"
            flex={1}
            loading={saving && isLast}
            onPress={() => void next()}
          />
        </BottomBar>
      }
    >
      <AppText variant="headline" accessibilityRole="header" style={styles.title}>
        {current.title}
      </AppText>
      {step === 0 ? <WhatFields form={form} /> : null}
      {step === 1 ? <ReturnFields form={form} /> : null}
      {step === 2 ? (
        <>
          <AppText variant="body" tone="muted" style={styles.lead}>
            Discounts, shipping or restocking fees can change it. Leave it blank if you’re unsure.
          </AppText>
          <RefundFields form={form} />
        </>
      ) : null}
      {isLast ? (
        <>
          <OptionCards
            label="Remind me to check in"
            columns={1}
            options={reminderOptions}
            value={reminderChoice}
            onChange={setReminderChoice}
          />
          {reminderChoice !== 'none' ? (
            <Notice icon="bell" tone="surface">
              We’ll ask to send notifications when you save. If you decline, the reminder still
              shows in the Reminders tab.
            </Notice>
          ) : null}
          <NotesField form={form} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { marginTop: spacing.lg },
  lead: { marginTop: -spacing.sm },
});
