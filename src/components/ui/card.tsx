import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-[14px] border border-line bg-card shadow-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-[17px] pt-4", className)}>{children}</div>;
}

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
    <h3 className={cn("flex items-center justify-between text-sm font-bold text-ink", className)}>
      <span>{children}</span>
      {note ? <span className="text-xs font-semibold text-muted">{note}</span> : null}
    </h3>
  );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-[17px] pb-4 pt-2", className)}>{children}</div>;
}
