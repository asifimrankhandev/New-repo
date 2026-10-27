import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { evidence } from '@/db/schema';
import type { IsoDate } from '@/domain/dates';
import type { EvidenceType } from '@/domain/enums';
import { touchCase } from '@/features/cases/case-repository';
import { createId } from '@/lib/create-id';

import { deleteEvidenceFile, storeEvidenceFile } from './evidence-storage';

export interface NewEvidenceInput {
  caseId: string;
  sourceUri: string;
  originalFileName: string;
  mimeType: string;
  evidenceType: EvidenceType;
  evidenceDate: IsoDate | null;
  note: string | null;
}

export async function addEvidence(input: NewEvidenceInput): Promise<string> {
  const id = createId();
  const { storedFileName, sizeBytes } = await storeEvidenceFile(
    input.sourceUri,
    id,
    input.mimeType,
  );
  try {
    db.transaction((tx) => {
      tx.insert(evidence)
        .values({
          id,
          caseId: input.caseId,
          storedFileName,
          originalFileName: input.originalFileName,
          mimeType: input.mimeType,
          sizeBytes,
          evidenceType: input.evidenceType,
          evidenceDate: input.evidenceDate,
          note: input.note,
          includeInExport: true,
          createdAt: Date.now(),
        })
        .run();
      touchCase(tx, input.caseId);
    });
  } catch (error) {
    // Never leave an orphaned copy behind when the record can't be saved.
    deleteEvidenceFile(storedFileName);
    throw error;
  }
  return id;
}

export function updateEvidence(
  id: string,
  changes: { evidenceType: EvidenceType; evidenceDate: IsoDate | null; note: string | null },
) {
  db.update(evidence).set(changes).where(eq(evidence.id, id)).run();
}

export function setEvidenceIncluded(id: string, includeInExport: boolean) {
  db.update(evidence).set({ includeInExport }).where(eq(evidence.id, id)).run();
}

export function removeEvidence(id: string) {
  const row = db.select().from(evidence).where(eq(evidence.id, id)).get();
  if (!row) return;
  db.delete(evidence).where(eq(evidence.id, id)).run();
  deleteEvidenceFile(row.storedFileName);
}

export function selectEvidenceForCase(caseId: string) {
  return db.select().from(evidence).where(eq(evidence.caseId, caseId));
}

export function selectEvidence(id: string) {
  return db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
}

export function getEvidenceForCase(caseId: string) {
  return db.select().from(evidence).where(eq(evidence.caseId, caseId)).all();
}
