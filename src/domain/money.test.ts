import { centsToInput, formatCents, parseMoneyInput, splitFormattedCents } from './money';

describe('parseMoneyInput', () => {
  it.each([
    ['148', 14800],
    ['148.5', 14850],
    ['148.05', 14805],
    ['$1,234.56', 123456],
    [' 0.99 ', 99],
    ['0', 0],
  ])('parses %p as %p cents', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1.234', '1.2.3', '10000000.01'])('rejects %p', (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });

  it('avoids floating-point drift', () => {
    expect(parseMoneyInput('0.29')).toBe(29);
    expect(parseMoneyInput('1.10')).toBe(110);
  });
});

describe('formatting', () => {
  it('formats cents as US dollars', () => {
    expect(formatCents(14800)).toBe('$148.00');
    expect(formatCents(123456)).toBe('$1,234.56');
  });

  it('splits whole and fractional parts', () => {
    expect(splitFormattedCents(35699)).toEqual({ whole: '$356', fraction: '.99' });
  });

  it('round-trips through the edit format', () => {
    expect(centsToInput(14805)).toBe('148.05');
    expect(parseMoneyInput(centsToInput(14805))).toBe(14805);
    expect(centsToInput(null)).toBe('');
  });
});
