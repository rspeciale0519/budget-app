// Legal pages carry a visible DRAFT banner until the owner supplies reviewed
// copy (build-spec prerequisite). The banner is intentional and must remain
// until real, counsel-reviewed text replaces the placeholder body.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <div className="mb-8 rounded-card border border-debit/40 bg-debit-tint px-4 py-3 text-sm text-ink">
        <span className="font-semibold">Draft — pending owner review.</span> This is placeholder
        text and is not the final agreement.
      </div>
      <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] text-ink">{title}</h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-dim">Last updated {updated}</p>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-ink">
        {children}
      </div>
    </article>
  );
}
