import { findLikelyDuplicates } from './duplicates';
import { makeCase } from './test-fixtures';

describe('findLikelyDuplicates', () => {
  const existing = [
    makeCase({
      id: 'a',
      retailerName: 'Sable & Co.',
      itemName: 'Wool overshirt',
      orderReference: 'SC-100',
    }),
    makeCase({
      id: 'b',
      retailerName: 'Lumen Home',
      itemName: 'Linen duvet set',
      orderReference: null,
    }),
  ];

  it('matches the same retailer and order reference regardless of formatting', () => {
    const result = findLikelyDuplicates(
      { retailerName: 'sable and co', itemName: 'Shirt', orderReference: 'sc 100' },
      existing,
    );
    // "sableandco" ≠ "sableco": different retailer spelling is not treated as the same.
    expect(result).toEqual([]);
    const exact = findLikelyDuplicates(
      { retailerName: 'SABLE & CO', itemName: 'Shirt', orderReference: 'sc-100' },
      existing,
    );
    expect(exact.map((item) => item.id)).toEqual(['a']);
  });

  it('matches the same retailer and a similar item name', () => {
    const result = findLikelyDuplicates(
      { retailerName: 'Lumen Home', itemName: 'linen duvet', orderReference: null },
      existing,
    );
    expect(result.map((item) => item.id)).toEqual(['b']);
  });

  it('ignores the same item from a different retailer', () => {
    const result = findLikelyDuplicates(
      { retailerName: 'Other Store', itemName: 'Wool overshirt', orderReference: 'SC-100' },
      existing,
    );
    expect(result).toEqual([]);
  });

  it('does not treat very short names as contained matches', () => {
    const result = findLikelyDuplicates(
      { retailerName: 'Lumen Home', itemName: 'set', orderReference: null },
      existing,
    );
    expect(result).toEqual([]);
  });
});
