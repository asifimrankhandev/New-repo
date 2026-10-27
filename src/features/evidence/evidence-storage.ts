import { Directory, File, Paths } from 'expo-file-system';

/** 15 MB keeps backups and exports manageable on any device. */
export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

export class EvidenceFileError extends Error {
  constructor(
    readonly reason: 'too-large' | 'unsupported' | 'missing' | 'storage',
    message: string,
  ) {
    super(message);
    this.name = 'EvidenceFileError';
  }
}

/** Evidence lives in app-private storage; originals are copied, never rewritten. */
function evidenceDirectory(): Directory {
  const directory = new Directory(Paths.document, 'evidence');
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

export function getEvidenceFile(storedFileName: string): File {
  return new File(evidenceDirectory(), storedFileName);
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function validateEvidence(mimeType: string, sizeBytes: number): void {
  if (!(mimeType in ALLOWED_MIME_TYPES)) {
    throw new EvidenceFileError('unsupported', 'Choose a photo, PDF or text file.');
  }
  if (sizeBytes > MAX_EVIDENCE_BYTES) {
    throw new EvidenceFileError('too-large', 'Files must be 15 MB or smaller.');
  }
}

/** Copies a picked file into app storage under `<id>.<ext>` and returns its stored size. */
export async function storeEvidenceFile(
  sourceUri: string,
  id: string,
  mimeType: string,
): Promise<{ storedFileName: string; sizeBytes: number }> {
  const source = new File(sourceUri);
  if (!source.exists)
    throw new EvidenceFileError('missing', 'The selected file is no longer available.');
  validateEvidence(mimeType, source.size);
  const storedFileName = `${id}.${ALLOWED_MIME_TYPES[mimeType] ?? 'bin'}`;
  const destination = getEvidenceFile(storedFileName);
  try {
    await source.copy(destination, { overwrite: true });
  } catch {
    throw new EvidenceFileError('storage', 'The file couldn’t be saved. Check your free storage.');
  }
  return { storedFileName, sizeBytes: destination.size };
}

/** Writes a base64 payload (from a backup) into app storage. */
export async function writeEvidenceFromBase64(storedFileName: string, base64: string) {
  const file = getEvidenceFile(storedFileName);
  file.create({ overwrite: true });
  await file.write(base64, { encoding: 'base64' });
}

export function deleteEvidenceFile(storedFileName: string): void {
  const file = getEvidenceFile(storedFileName);
  if (file.exists) file.delete();
}

/** Removes stored files no record points to (e.g. after a restore). */
export function pruneEvidenceFiles(keep: ReadonlySet<string>): void {
  for (const entry of evidenceDirectory().list()) {
    if (entry instanceof File && !keep.has(entry.name)) entry.delete();
  }
}

export function deleteAllEvidenceFiles(): void {
  const directory = new Directory(Paths.document, 'evidence');
  if (directory.exists) directory.delete();
}
