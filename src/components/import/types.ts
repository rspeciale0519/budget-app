import type { SignRule } from "@prisma/client";
import type { DateFormat } from "@/lib/import/auto-detect";
import type { MappingConfig } from "@/services/import";

export interface ParsedCsvState {
  headers: string[];
  rows: Record<string, string>[];
  text: string;
}

/** UI-side mapping draft. Empty string means "not mapped". */
export interface DraftMapping {
  date: string;
  description: string;
  merchant: string;
  amount: string;
  debit: string;
  credit: string;
  runningBalance: string;
  signRule: SignRule;
  dateFormat: DateFormat;
}

export const EMPTY_MAPPING: DraftMapping = {
  date: "",
  description: "",
  merchant: "",
  amount: "",
  debit: "",
  credit: "",
  runningBalance: "",
  signRule: "single_signed",
  dateFormat: "MM/DD/YYYY",
};

export function toMappingConfig(d: DraftMapping): MappingConfig {
  return {
    columnMap: {
      date: d.date,
      description: d.description,
      merchant: d.merchant || undefined,
      amount: d.amount || undefined,
      debit: d.debit || undefined,
      credit: d.credit || undefined,
      runningBalance: d.runningBalance || undefined,
    },
    signRule: d.signRule,
    dateFormat: d.dateFormat,
  };
}

/** Whether the draft has the minimum needed to preview. */
export function isMappingComplete(d: DraftMapping): boolean {
  if (!d.date || !d.description) return false;
  if (d.signRule === "separate_debit_credit") return Boolean(d.debit && d.credit);
  return Boolean(d.amount);
}
