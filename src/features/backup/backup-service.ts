import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db, type Transaction } from '@/db/client';
import {
  cases,
  evidence,
  preferences,
  refundEntries,
  reminders,
  timelineEvents,
} from '@/db/schema';
import { buildCasesCsv } from '@/domain/case-summary';
import { todayIso } from '@/domain/dates';
import type { RefundEntry } from '@/domain/models';
import {
  deleteAllEvidenceFiles,
  getEvidenceFile,
  pruneEvidenceFiles,
  writeEvidenceFromBase64,
} from '@/features/evidence/evidence-storage';
import { cancelAllNotifications } from '@/features/reminders/notification-service';
import { syncReminderNotifications } from '@/features/reminders/reminder-repository';

import { BACKUP_APP_ID, BACKUP_FORMAT_VERSION, type Backup, backupSchema } from './backup-schema';

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

async function shareFile(file: File, mimeType: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new BackupError('Sharing isn’t available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

async function writeCacheFile(name: string, contents: string): Promise<File> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(contents);
  return file;
}

async function collectBackup(): Promise<Backup> {
  const evidenceRows = db.select().from(evidence).all();
  const evidenceWithContent = await Promise.all(
    evidenceRows.map(async (row) => {
      const file = getEvidenceFile(row.storedFileName);
      return { ...row, contentBase64: file.exists ? await file.base64() : null };
    }),
  );
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      cases: db.select().from(cases).all(),
      timelineEvents: db.select().from(timelineEvents).all(),
      evidence: evidenceWithContent,
      refundEntries: db.select().from(refundEntries).all(),
      reminders: db.select().from(reminders).all(),
      preferences: db.select().from(preferences).all(),
    },
  };
}

/** Full backup, including evidence files, shared through the system share sheet. */
export async function shareBackup() {
  const backup = await collectBackup();
  const file = await writeCacheFile(
    `refund-beacon-backup-${todayIso()}.json`,
    JSON.stringify(backup),
  );
  await shareFile(file, 'application/json', 'Save your RefundBeacon backup');
}

/** Spreadsheet-friendly list of all cases (no evidence files). */
export async function shareCasesCsv() {
  const allCases = db.select().from(cases).all();
  const entriesByCase = new Map<string, RefundEntry[]>();
  for (const entry of db.select().from(refundEntries).all()) {
    entriesByCase.set(entry.caseId, [...(entriesByCase.get(entry.caseId) ?? []), entry]);
  }
  const file = await writeCacheFile(
    `refund-beacon-cases-${todayIso()}.csv`,
    buildCasesCsv(allCases, entriesByCase),
  );
  await shareFile(file, 'text/csv', 'Export your cases');
}

/** Lets the user pick a backup file and validates it fully before anything is changed. */
export async function pickBackup(): Promise<Backup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await new File(asset.uri).text());
  } catch {
    throw new BackupError('This file isn’t a RefundBeacon backup.');
  }
  const validation = backupSchema.safeParse(parsed);
  if (!validation.success) {
    throw new BackupError(
      'This backup is damaged or from an incompatible version. Nothing was changed.',
    );
  }
  return validation.data;
}

function clearAllRows(tx: Transaction) {
  tx.delete(reminders).run();
  tx.delete(refundEntries).run();
  tx.delete(evidence).run();
  tx.delete(timelineEvents).run();
  tx.delete(cases).run();
  tx.delete(preferences).run();
}

/** Replaces all local data with a validated backup. */
export async function restoreBackup(backup: Backup) {
  const { data } = backup;
  // Write files first: if storage fails, the existing database is still intact.
  const staged: string[] = [];
  for (const item of data.evidence) {
    if (item.contentBase64 !== null) {
      await writeEvidenceFromBase64(item.storedFileName, item.contentBase64);
      staged.push(item.storedFileName);
    }
  }
  await cancelAllNotifications();
  db.transaction((tx) => {
    clearAllRows(tx);
    for (const row of data.cases) tx.insert(cases).values(row).run();
    for (const row of data.timelineEvents) tx.insert(timelineEvents).values(row).run();
    for (const { contentBase64: _content, ...row } of data.evidence)
      tx.insert(evidence).values(row).run();
    for (const row of data.refundEntries) tx.insert(refundEntries).values(row).run();
    for (const row of data.reminders) tx.insert(reminders).values(row).run();
    for (const row of data.preferences) tx.insert(preferences).values(row).run();
  });
  pruneEvidenceFiles(new Set(data.evidence.map((item) => item.storedFileName)));
  await syncReminderNotifications();
  return { caseCount: data.cases.length, missingFiles: data.evidence.length - staged.length };
}

/** Removes every case, evidence file, reminder and preference from this device. */
export async function deleteAllData() {
  await cancelAllNotifications();
  db.transaction(clearAllRows);
  deleteAllEvidenceFiles();
}
