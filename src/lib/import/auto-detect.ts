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

/** Infer the date format from sample cell values; defaults to US MM/DD/YYYY. */
export function guessDateFormat(samples: string[]): DateFormat {
  for (const raw of samples) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(v)) return "YYYY-MM-DD";
    const parts = v.split(/[/.\-]/);
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (Number.isFinite(a) && a > 12 && a <= 31) return "DD/MM/YYYY";
    if (Number.isFinite(b) && b > 12 && b <= 31) return "MM/DD/YYYY";
  }
  return "MM/DD/YYYY";
}

/** Pick the sign rule that matches the detected columns. */
export function guessSignRule(detected: DetectedMapping): SignRule {
  if (detected.debit && detected.credit) return "separate_debit_credit";
  return "single_signed";
}
