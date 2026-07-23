import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

// A marketing section with a mono eyebrow and serif title, segmented from its
// neighbours by a hairline ledger rule.
export function Section({
  eyebrow,
  title,
  intro,
  children,
  ruled = true,
  className,
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  children?: React.ReactNode;
  ruled?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("border-rule", ruled && "border-t", className)}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        {(eyebrow || title) && (
          <Reveal className="mb-12 max-w-2xl">
            {eyebrow && (
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">{eyebrow}</p>
            )}
            {title && (
              <h2 className="mt-4 font-serif text-3xl font-medium leading-[1.08] tracking-[-0.02em] text-ink sm:text-4xl">
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
