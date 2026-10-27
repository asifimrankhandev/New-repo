import type { RefundCase } from './models';

type CaseIdentity = Pick<RefundCase, 'retailerName' | 'itemName' | 'orderReference'>;

/** Case- and punctuation-insensitive form used for comparison ("Sable & Co." → "sableco"). */
function normalize(value: string | null): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sameItem(a: string, b: string): boolean {
  if (a === '' || b === '') return false;
  return a === b || (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)));
}

/**
 * Existing cases that look like the one being created: same retailer, and either the same
 * order reference or a matching item name. Used only to warn — the user can still proceed.
 */
export function findLikelyDuplicates<T extends CaseIdentity>(
  candidate: CaseIdentity,
  existing: readonly T[],
): T[] {
  const retailer = normalize(candidate.retailerName);
  const order = normalize(candidate.orderReference);
  const item = normalize(candidate.itemName);
  if (retailer === '') return [];
  return existing.filter((other) => {
    if (normalize(other.retailerName) !== retailer) return false;
    const otherOrder = normalize(other.orderReference);
    if (order !== '' && otherOrder !== '' && order === otherOrder) return true;
    return sameItem(item, normalize(other.itemName));
  });
}
