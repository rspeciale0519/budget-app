import { site } from "@/lib/site-config";
import { cn } from "@/lib/utils";

// The mark: two statement rules (personal · business) joined by a single green
// node — the owner-draw bridge, in miniature. Serif wordmark for the masthead.
// onDark inverts it for the ledger's dark cover.
export function Wordmark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="20" height="20" rx="5" className={onDark ? "fill-paper" : "fill-ink"} />
        <line x1="6" y1="8" x2="16" y2="8" className={onDark ? "stroke-ink" : "stroke-paper"} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="14" x2="16" y2="14" className={onDark ? "stroke-ink" : "stroke-paper"} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="11" cy="11" r="2" className="fill-credit" />
      </svg>
      <span
        className={cn(
          "font-serif text-[19px] font-medium leading-none tracking-[-0.01em]",
          onDark ? "text-paper" : "text-ink",
        )}
      >
        {site.name}
      </span>
    </span>
  );
}
