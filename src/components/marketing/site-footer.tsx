import Link from "next/link";
import { site, footerNav, primaryCta } from "@/lib/site-config";
import { Wordmark } from "./wordmark";
import { Cta } from "./cta";

export function SiteFooter() {
  const year = 2026; // Static build; no Date.now() in server render.
  return (
    <footer className="border-t border-rule bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <Wordmark />
            <p className="mt-4 text-sm leading-relaxed text-muted">{site.tagline}</p>
            <div className="mt-6">
              <Cta href={primaryCta.href} variant="primary" size="md">
                {primaryCta.label}
              </Cta>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
            {footerNav.map((col) => (
              <div key={col.title}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">{col.title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.name}. A budgeting tool, not financial, tax, or accounting advice.</p>
          <p className="font-mono tracking-tight">Built for owner-operators.</p>
        </div>
      </div>
    </footer>
  );
}
