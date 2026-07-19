// Calendar dates (YYYY-MM-DD), not timestamps. All arithmetic is done in UTC so
// a timezone offset can never shift a due/transaction date by a day.

declare const calendarDateBrand: unique symbol;

/** A branded YYYY-MM-DD string proven to be a real calendar date. */
export type CalendarDate = string & { readonly [calendarDateBrand]: "CalendarDate" };

const PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s: string): boolean {
  if (!PATTERN.test(s)) return false;
  const parts = s.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function calendarDate(s: string): CalendarDate {
  if (!isRealDate(s)) {
    throw new Error(`Invalid calendar date: "${s}" (expected a real YYYY-MM-DD)`);
  }
  return s as CalendarDate;
}

function formatUtc(dt: Date): CalendarDate {
  const y = dt.getUTCFullYear().toString().padStart(4, "0");
  const m = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = dt.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}` as CalendarDate;
}

/** Midnight-UTC Date for persistence in a Postgres `date` column. */
export function toUtcDate(d: CalendarDate): Date {
  return new Date(`${d}T00:00:00.000Z`);
}

/** Read a Postgres `date` (a JS Date at UTC midnight) back to a CalendarDate. */
export function fromDbDate(d: Date): CalendarDate {
  return formatUtc(d);
}

export function addDays(d: CalendarDate, days: number): CalendarDate {
  const base = toUtcDate(d).getTime();
  return formatUtc(new Date(base + days * 86_400_000));
}

export function compare(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Whole days from a to b (b − a); negative when b is before a. */
export function diffDays(a: CalendarDate, b: CalendarDate): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / 86_400_000);
}

export function isBefore(a: CalendarDate, b: CalendarDate): boolean {
  return compare(a, b) < 0;
}

export function isAfter(a: CalendarDate, b: CalendarDate): boolean {
  return compare(a, b) > 0;
}

/** The current calendar date in the given IANA timezone (defaults to system). */
export function today(timeZone?: string): CalendarDate {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return calendarDate(fmt.format(new Date()));
}
