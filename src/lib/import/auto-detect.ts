import type { SignRule } from "@prisma/client";

export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

export interface DetectedMapping {
  date?: string;
  description?: string;
  merchant?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  runningBalance?: string;
}

// Patterns are tried in order (strongest synonym first) ACROSS all headers, so a
// later column with a better name beats an earlier weak match — e.g. Chase lists
// "Details" (DEBIT/CREDIT) before the real "Description" column.
const SYNONYMS: { field: keyof DetectedMapping; patterns: RegExp[] }[] = [
  { field: "date", patterns: [/^(transaction|posting|posted|trans|value)?\s*date$/, /\bdate\b/] },
  { field: "debit", patterns: [/\b(debit|withdrawal|withdrawals|money out|paid out|outflow)\b/] },
  { field: "credit", patterns: [/\b(credit|deposit|deposits|money in|paid in|inflow)\b/] },
  { field: "amount", patterns: [/^amount$/, /\bamount\b/, /\bamt\b/, /\bvalue\b/] },
  { field: "runningBalance", patterns: [/\b(running\s*)?balance\b/, /\bbalance\b/] },
  { field: "merchant", patterns: [/\b(merchant|payee|counterparty)\b/] },
  {
    field: "description",
    patterns: [
      /\bdescription\b/,
      /\bdesc\b/,
      /\b(memo|narrative|reference)\b/,
      /\b(details|name|notes?)\b/,
    ],
  },
];

/** Best-effort column → field mapping from a CSV's headers. */
export function guessColumns(headers: string[]): DetectedMapping {
  const detected: DetectedMapping = {};
  const used = new Set<string>();
  for (const { field, patterns } of SYNONYMS) {
    let hit: string | undefined;
    for (const p of patterns) {
      hit = headers.find((h) => !used.has(h) && p.test(h.toLowerCase().trim()));
      if (hit) break;
    }
    if (hit) {
      detected[field] = hit;
      used.add(hit);
    }
  }
  // If we found a single signed "amount", debit/credit are noise — drop them.
  if (detected.amount && !(detected.debit && detected.credit)) {
    delete detected.debit;
    delete detected.credit;
  }
  return detected;
}

export interface DateFormatGuess {
  format: DateFormat;
  /** True when every sample was a slash/dot date whose halves are both ≤ 12,
   *  so MM/DD vs DD/MM genuinely can't be told apart from the data. */
  ambiguous: boolean;
}

/** Infer the date format from sample cell values, flagging genuine ambiguity. */
export function analyzeDateFormat(samples: string[]): DateFormatGuess {
  let sawSample = false;
  for (const raw of samples) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    sawSample = true;
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(v)) return { format: "YYYY-MM-DD", ambiguous: false };
    const parts = v.split(/[/.\-]/);
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (Number.isFinite(a) && a > 12 && a <= 31) return { format: "DD/MM/YYYY", ambiguous: false };
    if (Number.isFinite(b) && b > 12 && b <= 31) return { format: "MM/DD/YYYY", ambiguous: false };
  }
  // Undecidable: default to US, but say so if we actually saw ambiguous samples.
  return { format: "MM/DD/YYYY", ambiguous: sawSample };
}

/** Infer the date format from sample cell values; defaults to US MM/DD/YYYY. */
export function guessDateFormat(samples: string[]): DateFormat {
  return analyzeDateFormat(samples).format;
}

/** Pick the sign rule that matches the detected columns. */
export function guessSignRule(detected: DetectedMapping): SignRule {
  if (detected.debit && detected.credit) return "separate_debit_credit";
  return "single_signed";
}

/** Fraction of parsed, non-zero numeric samples that are positive (blanks ignored). */
function positiveFraction(samples: string[]): number {
  const nums = samples
    .map((s) => Number((s ?? "").replace(/[$,\s]/g, "")))
    .filter((n) => Number.isFinite(n) && n !== 0);
  if (nums.length === 0) return 0;
  return nums.filter((n) => n > 0).length / nums.length;
}

/**
 * Credit-card exports usually show charges as positive numbers, which the default
 * "one signed amount" rule books as income — silently turning every purchase into
 * a deposit. When the destination account is a credit card and almost every amount
 * is positive, the invert rule is almost certainly what's wanted.
 */
export function suggestsCreditCardInvert(
  accountType: string | undefined,
  detected: DetectedMapping,
  amountSamples: string[],
): boolean {
  if (accountType !== "credit_card") return false;
  if (detected.debit && detected.credit) return false; // two columns → sign is explicit
  return positiveFraction(amountSamples) >= 0.9;
}
