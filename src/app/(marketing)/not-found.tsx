import { Cta } from "@/components/marketing/cta";

export default function MarketingNotFound() {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center px-5 py-24 text-center sm:px-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">404</p>
        <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.02em] text-ink sm:text-5xl">
          That page isn&apos;t on the books.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted">
          The link may be old or mistyped. Let&apos;s get you back to something that adds up.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Cta href="/" variant="primary" size="lg">
            Back to home
          </Cta>
          <Cta href="/pricing" variant="outline" size="lg">
            See pricing
          </Cta>
        </div>
      </div>
    </section>
  );
}
