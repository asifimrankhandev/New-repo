import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TopBar } from '@/components/ui/top-bar';
import { type CaseFormValues, caseInputSchema } from '@/domain/case-input';
import type { RefundCase } from '@/domain/models';
import { centsToInput } from '@/domain/money';
import { getCase, updateCase } from '@/features/cases/case-repository';
import {
  NotesField,
  RefundFields,
  ReturnFields,
  WhatFields,
} from '@/features/cases/components/case-form-fields';
import { MissingCase } from '@/features/cases/components/missing-case';
import { showError } from '@/lib/dialogs';
import { useForm } from '@/lib/use-form';
import { spacing } from '@/theme/tokens';

function toFormValues(refundCase: RefundCase): CaseFormValues {
  return {
    retailerName: refundCase.retailerName,
    itemName: refundCase.itemName,
    purchaseAmount: centsToInput(refundCase.purchaseAmountCents),
    purchaseDate: refundCase.purchaseDate ?? '',
    orderReference: refundCase.orderReference ?? '',
    paymentType: refundCase.paymentType ?? '',
    returnMethod: refundCase.returnMethod ?? '',
    handoffDate: refundCase.handoffDate ?? '',
    carrierName: refundCase.carrierName ?? '',
    trackingReference: refundCase.trackingReference ?? '',
    expectedRefundAmount: centsToInput(refundCase.expectedRefundCents),
    expectedRefundDate: refundCase.expectedRefundDate ?? '',
    expectedRefundSource: refundCase.expectedRefundSource ?? '',
    expectedRefundSourceNote: refundCase.expectedRefundSourceNote ?? '',
    notes: refundCase.notes ?? '',
  };
}

export default function EditCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial] = useState(() => getCase(id));
  if (!initial) return <MissingCase />;
  return <EditCaseForm refundCase={initial} />;
}

function EditCaseForm({ refundCase }: { refundCase: RefundCase }) {
  const form = useForm<CaseFormValues>(toFormValues(refundCase));
  const [saving, setSaving] = useState(false);

  const save = () => {
    const input = form.validate(caseInputSchema);
    if (!input) return;
    setSaving(true);
    try {
      updateCase(refundCase.id, input);
      router.back();
    } catch (error) {
      showError('Couldn’t save your changes', error);
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<TopBar title="Edit case" leading="close" onLeadingPress={() => router.back()} />}
      footer={
        <BottomBar>
          <Button label="Save changes" flex={1} loading={saving} onPress={save} />
        </BottomBar>
      }
    >
      <View style={styles.section}>
        <SectionHeader title="Purchase" />
        <WhatFields form={form} />
      </View>
      <View style={styles.section}>
        <SectionHeader title="Return" />
        <ReturnFields form={form} />
      </View>
      <View style={styles.section}>
        <SectionHeader title="Expected refund" />
        <RefundFields form={form} />
      </View>
      <NotesField form={form} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg, paddingTop: spacing.sm },
});
