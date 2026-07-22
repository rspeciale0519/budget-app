import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "lg";

// Link-styled CTAs at marketing scale (larger and bolder than the app's compact
// Button). Racing green is the one loud move; everything else stays quiet.
const variants: Record<Variant, string> = {
  primary: "bg-credit font-semibold text-paper shadow-card hover:opacity-90 active:translate-y-px",
  outline: "border border-rule-strong bg-surface/60 text-ink hover:border-dim hover:bg-surface",
  ghost: "text-ink hover:bg-raised",
};

const sizes: Record<Size, string> = {
  md: "h-10 rounded-control px-4 text-sm",
  lg: "h-12 rounded-control px-6 text-[15px]",
};

export function Cta({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  const external = href.startsWith("mailto:") || href.startsWith("http");
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[opacity,background-color,border-color,transform] duration-150",
    sizes[size],
    variants[variant],
    className,
  );
  if (external) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
