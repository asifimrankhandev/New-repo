import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { buildTextSummary, buildTimelineCsv, type SummaryInput } from '@/domain/case-summary';
import { todayIso } from '@/domain/dates';
import { insertEvent } from '@/features/cases/case-repository';
import { db } from '@/db/client';

export type SummaryFormat = 'text' | 'csv';

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'case'
  );
}

export function renderSummary(input: SummaryInput, format: SummaryFormat): string {
  return format === 'text' ? buildTextSummary(input) : buildTimelineCsv(input);
}

/** Writes the previewed summary to a temporary file and opens the share sheet. */
export async function shareSummary(input: SummaryInput, format: SummaryFormat) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing isn’t available on this device.');
  }
  const extension = format === 'text' ? 'txt' : 'csv';
  const file = new File(
    Paths.cache,
    `refund-case-${slugify(input.refundCase.itemName)}-${todayIso()}.${extension}`,
  );
  file.create({ overwrite: true });
  await file.write(renderSummary(input, format));
  await Sharing.shareAsync(file.uri, {
    mimeType: format === 'text' ? 'text/plain' : 'text/csv',
    dialogTitle: 'Share case summary',
  });
  insertEvent(db, {
    caseId: input.refundCase.id,
    type: 'case-exported',
    source: 'system',
    occurredAt: Date.now(),
    description: format === 'text' ? 'Text summary' : 'CSV timeline',
  });
}
