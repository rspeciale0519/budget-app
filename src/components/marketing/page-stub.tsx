import { primaryCta } from "@/lib/site-config";
import { Cta } from "./cta";

// Intentional-looking placeholder for routes filled in during later phases.
// Renders real chrome + a titled section so the route is a valid 200, never a
// broken-looking page.
export function PageStub({ eyebrow, title, blurb }: { eyebrow: string; title: string; blurb: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">{eyebrow}</p>
      <h1 className="mt-4 max-w-2xl font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{blurb}</p>
      <div className="mt-8">
        <Cta href={primaryCta.href} variant="primary" size="lg">
          {primaryCta.label}
        </Cta>
      </div>
    </section>
  );
}
