import { describe, expect, it } from 'vitest';
import { addDays, dateOfTimestamp, daysBetween, isRealDate } from './date';

describe('isRealDate', () => {
  it('accepts real dates, including leap days', () => {
    expect(isRealDate('2026-10-18')).toBe(true);
    expect(isRealDate('2028-02-29')).toBe(true);
  });
  it('rejects impossible and malformed dates', () => {
    for (const s of ['2026-02-29', '2026-13-01', '2026-00-10', '2026-10-32', '18-10-2026', '2026-1-1', '']) {
      expect(isRealDate(s), s).toBe(false);
    }
  });
});

describe('addDays / daysBetween', () => {
  it('adds the freshness TTLs from the spec (30, 90, 14, 180 days)', () => {
    expect(addDays('2026-10-18', 30)).toBe('2026-11-17'); // spec 8.3 example
    expect(addDays('2026-10-18', 14)).toBe('2026-11-01');
    expect(addDays('2026-10-18', 90)).toBe('2027-01-16');
    expect(addDays('2026-10-18', 180)).toBe('2027-04-16');
  });
  it('crosses month and year ends, and subtracts', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('round-trips with daysBetween', () => {
    expect(daysBetween('2026-10-18', '2026-11-17')).toBe(30);
    expect(daysBetween('2026-11-17', '2026-10-18')).toBe(-30);
    expect(daysBetween('2026-10-18', '2026-10-18')).toBe(0);
  });
  it('throws on bad input rather than guessing', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
    expect(() => addDays('2026-10-18', 1.5)).toThrow(RangeError);
  });
});

describe('dateOfTimestamp', () => {
  it('takes the UTC date of an ISO timestamp', () => {
    expect(dateOfTimestamp('2026-10-18T23:59:59.999Z')).toBe('2026-10-18');
  });
  it('rejects non-timestamps', () => {
    expect(() => dateOfTimestamp('yesterday')).toThrow(RangeError);
  });
});
