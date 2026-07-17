import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "credit" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

/*
  `bg-ink text-paper` inverts itself: a bright chip on dark paper, a dark one on
  light. One declaration, both themes, no branching.

  `credit` is for actions that move money toward you — signing in, committing an
  import. It is rationed; most buttons are not that.
*/
const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:opacity-85 active:opacity-75",
  credit: "bg-credit font-semibold text-paper hover:opacity-85 active:opacity-75",
  outline: "border border-rule-strong bg-surface text-ink hover:border-dim hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  danger: "border border-alert/40 bg-alert-tint text-alert hover:border-alert/70",
};

const sizes: Record<Size, string> = {
  sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
  md: "h-9 gap-2 rounded-control px-3.5 text-[13px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium",
        "transition-[opacity,background-color,border-color,transform] duration-150",
        "active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
