export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parse a ?ym=YYYY-MM param, falling back to a YYYY-MM-DD date string. */
export function parseYm(ym: string | undefined, fallback: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(ym ?? "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) };
  const p = fallback.split("-");
  return { year: Number(p[0]), month: Number(p[1]) };
}

/** Shift a year/month by delta months, returning YYYY-MM. */
export function shiftMonth(year: number, month: number, delta: number): string {
  const idx = year * 12 + (month - 1) + delta;
  const y = Math.floor(idx / 12);
  const mo = (idx % 12) + 1;
  return `${y}-${String(mo).padStart(2, "0")}`;
}
