import { cn } from "@/lib/utils";
import type { BillDisplayStatus } from "@/services/bills/bill-status";

/** The color vocabulary mirrors the shared bill-status keys 1:1. */
export type BillStatus = BillDisplayStatus;

/*
  One map, three call sites. The dashboard, the bill calendar and the tiling pane
  each carried their own copy of this, and they had already drifted apart — the
  derivation now lives in services/bills/bill-status.ts and they all read it.

  Note what red is spent on: only `overdue`. "Due today" and "due soon" are warm
  amber, not alarming — an unpaid bill that isn't late yet is the normal state of
  a bill, not an error. "Due later" is calm and neutral.
*/
const CHIP: Record<BillStatus, string> = {
  overdue: "bg-alert-tint text-alert ring-alert/25",
  today: "bg-debit-tint text-debit ring-debit/25",
  soon: "bg-debit-tint text-debit ring-debit/25",
  later: "bg-scheduled-tint text-scheduled ring-scheduled/25",
  paid: "bg-credit-tint text-credit ring-credit/25",
};

const INK: Record<BillStatus, string> = {
  overdue: "text-alert",
  today: "text-debit",
  soon: "text-debit",
  later: "text-scheduled",
  paid: "text-credit",
};

/** The status color for contexts that carry their own layout (dots, bars, text). */
export function statusInk(status: BillStatus): string {
  return INK[status];
}

/**
 * Status always ships its own label. Color is the fast path for a sighted user
 * scanning a column; the word is what makes it true for everyone else.
 */
export function StatusTag({
  status,
  children,
  className,
}: {
  status: BillStatus;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        CHIP[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
