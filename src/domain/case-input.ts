import { z } from 'zod';

import { isIsoDate } from './dates';
import { dateSource, paymentType, returnMethod } from './enums';
import type { RefundCase } from './models';
import { parseMoneyInput } from './money';

/** Raw form values: everything is a string so inputs stay controlled and editable. */
export interface CaseFormValues {
  retailerName: string;
  itemName: string;
  purchaseAmount: string;
  purchaseDate: string;
  orderReference: string;
  paymentType: string;
  returnMethod: string;
  handoffDate: string;
  carrierName: string;
  trackingReference: string;
  expectedRefundAmount: string;
  expectedRefundDate: string;
  expectedRefundSource: string;
  expectedRefundSourceNote: string;
  notes: string;
}

export const EMPTY_CASE_FORM: CaseFormValues = {
  retailerName: '',
  itemName: '',
  purchaseAmount: '',
  purchaseDate: '',
  orderReference: '',
  paymentType: '',
  returnMethod: '',
  handoffDate: '',
  carrierName: '',
  trackingReference: '',
  expectedRefundAmount: '',
  expectedRefundDate: '',
  expectedRefundSource: '',
  expectedRefundSourceNote: '',
  notes: '',
};

export const NOTES_MAX_LENGTH = 2000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters.` })
    .transform((value) => (value === '' ? null : value));

const optionalDate = z
  .string()
  .refine((value) => value === '' || isIsoDate(value), { error: 'Choose a valid date.' })
  .transform((value) => (value === '' ? null : value));

const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.literal(''), z.enum(values)])
    .transform((value) => (value === '' ? null : (value as T[number])));

const requiredMoney = z.string().transform((value, ctx) => {
  const cents = parseMoneyInput(value);
  if (cents === null) {
    ctx.addIssue({
      code: 'custom',
      message: value.trim() === '' ? 'Enter the amount.' : 'Enter an amount like 148.00.',
    });
    return z.NEVER;
  }
  return cents;
});

const optionalMoney = z.string().transform((value, ctx) => {
  if (value.trim() === '') return null;
  const cents = parseMoneyInput(value);
  if (cents === null) {
    ctx.addIssue({ code: 'custom', message: 'Enter an amount like 148.00.' });
    return z.NEVER;
  }
  return cents;
});

/** Card numbers are 13–19 digits; never store one as an order reference. */
const LOOKS_LIKE_CARD_NUMBER = /^\d{13,19}$/;

export const whatStepSchema = z.object({
  retailerName: z.string().trim().min(1, { error: 'Enter the retailer.' }).max(120),
  itemName: z.string().trim().min(1, { error: 'Enter the item.' }).max(160),
  purchaseAmount: requiredMoney,
  purchaseDate: optionalDate,
  orderReference: optionalText(80).refine(
    (value) => value === null || !LOOKS_LIKE_CARD_NUMBER.test(value.replace(/[\s-]/g, '')),
    { error: 'This looks like a card number. Enter the order number instead.' },
  ),
  paymentType: optionalEnum(paymentType.values),
});

export const returnStepSchema = z.object({
  returnMethod: optionalEnum(returnMethod.values),
  handoffDate: optionalDate,
  carrierName: optionalText(60),
  trackingReference: optionalText(200),
});

export const refundStepSchema = z
  .object({
    expectedRefundAmount: optionalMoney,
    expectedRefundDate: optionalDate,
    expectedRefundSource: optionalEnum(dateSource.values),
    expectedRefundSourceNote: optionalText(200),
  })
  .superRefine((value, ctx) => {
    if (value.expectedRefundDate && !value.expectedRefundSource) {
      ctx.addIssue({
        code: 'custom',
        path: ['expectedRefundSource'],
        message: 'Say where this date comes from.',
      });
    }
  });

export const notesSchema = z.object({ notes: optionalText(NOTES_MAX_LENGTH) });

export type CaseInput = Pick<
  RefundCase,
  | 'retailerName'
  | 'itemName'
  | 'purchaseAmountCents'
  | 'purchaseDate'
  | 'orderReference'
  | 'paymentType'
  | 'returnMethod'
  | 'handoffDate'
  | 'carrierName'
  | 'trackingReference'
  | 'expectedRefundCents'
  | 'expectedRefundDate'
  | 'expectedRefundSource'
  | 'expectedRefundSourceNote'
  | 'notes'
>;

/** Validates the complete form and maps it to domain fields (money in cents). */
export const caseInputSchema = z
  .object({
    ...whatStepSchema.shape,
    ...returnStepSchema.shape,
    expectedRefundAmount: optionalMoney,
    expectedRefundDate: optionalDate,
    expectedRefundSource: optionalEnum(dateSource.values),
    expectedRefundSourceNote: optionalText(200),
    ...notesSchema.shape,
  })
  .superRefine((value, ctx) => {
    if (value.expectedRefundDate && !value.expectedRefundSource) {
      ctx.addIssue({
        code: 'custom',
        path: ['expectedRefundSource'],
        message: 'Say where this date comes from.',
      });
    }
  })
  .transform((value): CaseInput => ({
    retailerName: value.retailerName,
    itemName: value.itemName,
    purchaseAmountCents: value.purchaseAmount,
    purchaseDate: value.purchaseDate,
    orderReference: value.orderReference,
    paymentType: value.paymentType,
    returnMethod: value.returnMethod,
    handoffDate: value.handoffDate,
    carrierName: value.carrierName,
    trackingReference: value.trackingReference,
    expectedRefundCents: value.expectedRefundAmount,
    expectedRefundDate: value.expectedRefundDate,
    expectedRefundSource: value.expectedRefundSource,
    expectedRefundSourceNote: value.expectedRefundSourceNote,
    notes: value.notes,
  }));
