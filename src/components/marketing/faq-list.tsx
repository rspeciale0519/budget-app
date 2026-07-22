import type { Faq } from "@/lib/marketing-content";

// Native disclosure accordion — no JS state needed, keyboard-accessible for free.
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-rule border-y border-rule">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
            <span className="font-serif text-lg text-ink">{item.q}</span>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule-strong text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
