import { cn } from "@/lib/utils";

export type BillStatus = "overdue" | "soon" | "scheduled" | "paid";

/*
  One map, three call sites. The dashboard, the bill calendar and the tiling pane
  each carried their own copy of this, and they had already drifted apart.

  Note what red is spent on: only `overdue`. "Due soon" is warm, not alarming —
  a bill you haven't paid yet is the normal state of a bill, not an error.
*/
const CHIP: Record<BillStatus, string> = {
  overdue: "bg-alert-tint text-alert ring-alert/25",
  soon: "bg-debit-tint text-debit ring-debit/25",
  scheduled: "bg-scheduled-tint text-scheduled ring-scheduled/25",
  paid: "bg-credit-tint text-credit ring-credit/25",
};

const INK: Record<BillStatus, string> = {
  overdue: "text-alert",
  soon: "text-debit",
  scheduled: "text-scheduled",
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
