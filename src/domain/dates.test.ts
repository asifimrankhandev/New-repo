import {
  addDaysIso,
  combineDateAndTime,
  daysBetweenIso,
  formatRelativeDay,
  formatShortDate,
  isIsoDate,
  toIsoDate,
} from './dates';

describe('calendar dates', () => {
  it('validates ISO dates including impossible days', () => {
    expect(isIsoDate('2026-10-27')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('10/27/2026')).toBe(false);
  });

  it('adds days across month boundaries', () => {
    expect(addDaysIso('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('counts days across a daylight-saving change', () => {
    // US DST ends on Nov 1, 2026.
    expect(daysBetweenIso('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('uses the local calendar, not UTC', () => {
    expect(toIsoDate(new Date(2026, 9, 27, 23, 30))).toBe('2026-10-27');
  });

  it('combines a date with a wall-clock time', () => {
    const at = new Date(combineDateAndTime('2026-10-30', 9, 0));
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours()]).toEqual([
      2026, 9, 30, 9,
    ]);
  });

  it('formats short dates', () => {
    expect(formatShortDate('2026-10-20')).toBe('Oct 20');
  });

  it('describes recent days relatively', () => {
    const now = new Date(2026, 9, 27, 12);
    expect(formatRelativeDay(new Date(2026, 9, 27, 8).getTime(), now)).toBe('Today');
    expect(formatRelativeDay(new Date(2026, 9, 26, 8).getTime(), now)).toBe('Yesterday');
    expect(formatRelativeDay(new Date(2026, 9, 24, 8).getTime(), now)).toBe('3 days ago');
  });
});
