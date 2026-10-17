// Pure calendar-date helpers on 'YYYY-MM-DD' strings. No clock: "today" always comes from the Clock port.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRealDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toUtcMs(date: string): number {
  if (!isRealDate(date)) throw new RangeError(`not a real calendar date: ${date}`);
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, mo - 1, d);
}

const DAY_MS = 86_400_000;

/** Adds whole days to a date string. Negative values subtract. */
export function addDays(date: string, days: number): string {
  if (!Number.isInteger(days)) throw new RangeError(`days must be an integer: ${days}`);
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** The UTC calendar date of an ISO-8601 timestamp such as "2026-10-18T09:30:00.000Z". */
export function dateOfTimestamp(timestamp: string): string {
  const head = timestamp.slice(0, 10);
  if (!isRealDate(head)) throw new RangeError(`not an ISO timestamp: ${timestamp}`);
  return head;
}
