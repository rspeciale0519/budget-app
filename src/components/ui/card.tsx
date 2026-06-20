import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 pt-4", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn("text-sm font-medium text-slate-500", className)}>{children}</h3>;
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 pb-5 pt-2", className)}>{children}</div>;
}
