import { createHash } from "node:crypto";
import { toCents, type Money } from "@/lib/money";
import type { CalendarDate } from "@/lib/calendar-date";

export interface DedupeInput {
  accountId: string;
  date: CalendarDate;
  amount: Money;
  description: string;
  runningBalance?: Money | null;
}

// Unit-separator (U+001F) can't appear in normalized fields, so field
// boundaries are unambiguous (no ["a","b c"] vs ["a b","c"] collision).
const SEP = String.fromCharCode(0x1f);

function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Stable SHA-256 over normalized fields. Identical rows hash identically;
 * any field change yields a different hash. Absent and null runningBalance
 * are equivalent (and distinct from any value).
 */
export function dedupeHash(input: DedupeInput): string {
  const balance =
    input.runningBalance === undefined || input.runningBalance === null
      ? ""
      : toCents(input.runningBalance).toString();

  const canonical = [
    input.accountId,
    input.date,
    toCents(input.amount).toString(),
    normalizeDescription(input.description),
    balance,
  ].join(SEP);

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
