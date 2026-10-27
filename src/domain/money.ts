export const DEFAULT_CURRENCY = 'USD';

/** Largest amount accepted from user input: $10,000,000.00. */
export const MAX_AMOUNT_CENTS = 1_000_000_000;

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currencyCode: string): Intl.NumberFormat {
  const cached = formatters.get(currencyCode);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode });
  formatters.set(currencyCode, formatter);
  return formatter;
}

/** Formats integer minor units (cents) as a currency string, e.g. 14800 → "$148.00". */
export function formatCents(cents: number, currencyCode: string = DEFAULT_CURRENCY): string {
  return getFormatter(currencyCode).format(cents / 100);
}

/** Splits a formatted amount into whole and fractional parts for display ("$356", ".99"). */
export function splitFormattedCents(
  cents: number,
  currencyCode: string = DEFAULT_CURRENCY,
): { whole: string; fraction: string } {
  const formatted = formatCents(cents, currencyCode);
  const separatorIndex = formatted.lastIndexOf('.');
  if (separatorIndex === -1) return { whole: formatted, fraction: '' };
  return { whole: formatted.slice(0, separatorIndex), fraction: formatted.slice(separatorIndex) };
}

/** Formats cents as a plain decimal for editing, e.g. 14800 → "148.00". */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100)
    .toString()
    .padStart(2, '0');
  return `${whole}.${fraction}`;
}

/**
 * Parses user input such as "$1,234.5" into integer cents without floating-point math.
 * Returns null for empty, negative, malformed or out-of-range input.
 */
export function parseMoneyInput(input: string): number | null {
  const cleaned = input.replace(/[\s$,]/g, '');
  if (cleaned === '') return null;
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;
  const whole = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const cents = Number(whole) * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents) || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}
