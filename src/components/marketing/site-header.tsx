"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { site, mainNav, primaryCta, secondaryCta } from "@/lib/site-config";
import { Cta } from "./cta";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The landing opens on the ledger's dark cover; the header sits transparent
  // over it in paper ink until the page scrolls (or the mobile sheet opens),
  // then becomes the usual light glass bar.
  const onDark = pathname === "/" && !scrolled && !open;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        scrolled ? "border-rule bg-paper/95 backdrop-blur-md" : "border-transparent",
        onDark ? "bg-[#14140f]" : !scrolled && "bg-paper/0",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="rounded-sm focus-visible:outline-none" aria-label={`${site.name} home`}>
          <Wordmark onDark={onDark} />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {mainNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition-colors",
                  onDark
                    ? cn("hover:text-paper", active ? "text-paper" : "text-paper/60")
                    : cn("hover:text-ink", active ? "text-ink" : "text-muted"),
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Cta
            href={secondaryCta.href}
            variant="ghost"
            size="md"
            className={onDark ? "text-paper hover:bg-white/10 hover:text-paper" : undefined}
          >
            {secondaryCta.label}
          </Cta>
          <Cta href={primaryCta.href} variant="primary" size="md">
            {primaryCta.shortLabel}
          </Cta>
        </div>

        <button
          type="button"
          className={cn(
            "-mr-1 flex h-10 w-10 items-center justify-center rounded-control md:hidden",
            onDark ? "text-paper" : "text-ink",
          )}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-5">
            <span
              className={cn(
                "absolute left-0 block h-0.5 w-5 transition-all",
                onDark ? "bg-paper" : "bg-ink",
                open ? "top-1.5 rotate-45" : "top-0.5",
              )}
            />
            <span
              className={cn(
                "absolute left-0 top-1.5 block h-0.5 w-5 transition-opacity",
                onDark ? "bg-paper" : "bg-ink",
                open && "opacity-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 block h-0.5 w-5 transition-all",
                onDark ? "bg-paper" : "bg-ink",
                open ? "top-1.5 -rotate-45" : "top-[10px]",
              )}
            />
          </span>
        </button>
      </div>

      {open && (
        <div className="border-t border-rule bg-paper px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-rule py-3 text-[15px] text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-2">
            <Cta href={primaryCta.href} variant="primary" size="lg" className="w-full" onClick={() => setOpen(false)}>
              {primaryCta.label}
            </Cta>
            <Cta href={secondaryCta.href} variant="outline" size="lg" className="w-full" onClick={() => setOpen(false)}>
              {secondaryCta.label}
            </Cta>
          </div>
        </div>
      )}
    </header>
  );
}
