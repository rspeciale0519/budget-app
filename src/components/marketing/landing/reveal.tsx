import { cn } from "@/lib/utils";

// A CSS-only entrance: content is fully in the DOM and ends visible even with no
// JS or unsupported animations, so nothing can be stranded invisible. The fade
// plays on load with a small per-element delay for a gentle staggered reveal.
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  return (
    <Tag
      className={cn("mkt-reveal", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
