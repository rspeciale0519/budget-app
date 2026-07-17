import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn("rounded-card border border-rule bg-surface shadow-card", className)}
    >
      {children}
    </div>
  );
}

/** Ruled off from its content — the divider a ledger draws under a column head. */
export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("border-b border-rule px-4 py-3", className)}>{children}</div>;
}

/**
 * Card titles are eyebrows, not headlines. The figure inside the card is what
 * deserves the reader's eye; the label only says what they're looking at.
 */
export function CardTitle({
  className,
  children,
  note,
}: {
  className?: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <h3
      className={cn(
        "flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted",
        className,
      )}
    >
      <span>{children}</span>
      {note ? (
        <span className="font-medium normal-case tracking-normal text-dim">{note}</span>
      ) : null}
    </h3>
  );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-4 py-4", className)}>{children}</div>;
}
