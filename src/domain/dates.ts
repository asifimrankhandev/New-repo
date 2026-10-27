/**
 * Calendar dates (order date, expected refund date…) are stored as ISO strings "YYYY-MM-DD"
 * in the user's local calendar. Moments in time (event timestamps, reminders) are stored as
 * epoch milliseconds. Keeping the two apart avoids timezone drift on calendar dates.
 */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local midnight of an ISO calendar date. */
export function fromIsoDate(value: IsoDate): Date {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid ISO date: ${value}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function addDaysIso(value: IsoDate, days: number): IsoDate {
  const date = fromIsoDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetweenIso(from: IsoDate, to: IsoDate): number {
  const start = fromIsoDate(from);
  const end = fromIsoDate(to);
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / 86_400_000);
}

const shortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const longFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** "Oct 20" */
export function formatShortDate(value: IsoDate | Date): string {
  return shortFormatter.format(typeof value === 'string' ? fromIsoDate(value) : value);
}

/** "Oct 20, 2026" */
export function formatLongDate(value: IsoDate | Date): string {
  return longFormatter.format(typeof value === 'string' ? fromIsoDate(value) : value);
}

/** "Fri, Oct 30" */
export function formatWeekdayDate(value: IsoDate | Date): string {
  return weekdayFormatter.format(typeof value === 'string' ? fromIsoDate(value) : value);
}

/** "9:00 AM" */
export function formatTime(value: Date | number): string {
  return timeFormatter.format(typeof value === 'number' ? new Date(value) : value);
}

/** Uppercase month + zero-padded day for list gutters: { month: "NOV", day: "03" }. */
export function formatDateParts(value: Date | number): { month: string; day: string } {
  const date = typeof value === 'number' ? new Date(value) : value;
  return {
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate().toString().padStart(2, '0'),
  };
}

/** Combines a calendar date with a local wall-clock time into epoch milliseconds. */
export function combineDateAndTime(date: IsoDate, hour: number, minute: number): number {
  const result = fromIsoDate(date);
  result.setHours(hour, minute, 0, 0);
  return result.getTime();
}

/** Relative wording for recent activity: "Today", "Yesterday", "3 days ago", or a date. */
export function formatRelativeDay(timestamp: number, now: Date = new Date()): string {
  const days = daysBetweenIso(toIsoDate(new Date(timestamp)), toIsoDate(now));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatShortDate(new Date(timestamp));
}
