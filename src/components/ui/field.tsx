import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "h-9 w-full rounded-control border border-rule-strong bg-sunken px-3 text-[13px] text-ink " +
  "placeholder:text-dim transition-colors duration-150 hover:border-dim " +
  "focus:border-now focus:outline-none disabled:opacity-40";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

/** Amount inputs are data entry, not prose — mono and tabular like every other figure. */
export function AmountInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input inputMode="decimal" className={cn(CONTROL, "tabular", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, "cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({
  className,
  children,
  htmlFor,
}: {
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted",
        className,
      )}
    >
      {children}
    </label>
  );
}

/** Errors say what happened and what to do. They don't apologize and they aren't vague. */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-xs font-medium text-alert">
      {children}
    </p>
  );
}
