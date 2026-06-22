import { money, sub, mul, compare, isNegative, type Money } from "@/lib/money";
import { toUtcDate, type CalendarDate } from "@/lib/calendar-date";

export interface ScoreInput {
  billVendor: string;
  billAmount: Money;
  billDue: CalendarDate;
  txnDescription: string;
  txnMerchant: string | null;
  txnAmount: Money;
  txnDate: CalendarDate;
}

const DATE_WINDOW_DAYS = 5;
const MS_PER_DAY = 86_400_000;

function abs(m: Money): Money {
  return isNegative(m) ? sub(money(0), m) : m;
}

function max(a: Money, b: Money): Money {
  return compare(a, b) >= 0 ? a : b;
}

/** Whole days between two calendar dates. Both are UTC-anchored midnights, so
 * this is timezone-safe (no due-date drift). */
function dayDelta(a: CalendarDate, b: CalendarDate): number {
  return Math.round((toUtcDate(a).getTime() - toUtcDate(b).getTime()) / MS_PER_DAY);
}

function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Confidence in [0,1] that the transaction settles the bill, or `null` when the
 * candidate is disqualified (amount beyond tolerance, or date outside ±5 days).
 * Pure — no I/O. Money comparisons stay in decimal; only the dimensionless
 * score is converted to a number.
 */
export function scoreMatch(input: ScoreInput): number | null {
  const dateDelta = Math.abs(dayDelta(input.txnDate, input.billDue));
  if (dateDelta > DATE_WINDOW_DAYS) return null;

  const magnitude = abs(input.txnAmount);
  const tolerance = max(money("1.00"), mul(input.billAmount, 0.02));
  const delta = abs(sub(magnitude, input.billAmount));
  if (compare(delta, tolerance) > 0) return null;

  const amountCloseness = 1 - Number(delta.dividedBy(tolerance));
  const dateCloseness = 1 - dateDelta / DATE_WINDOW_DAYS;
  const vendorOverlap = jaccard(tokens(input.billVendor), tokens(input.txnMerchant ?? input.txnDescription));

  return 0.6 * amountCloseness + 0.2 * dateCloseness + 0.2 * vendorOverlap;
}
