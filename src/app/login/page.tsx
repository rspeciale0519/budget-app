import { LoginForm } from "@/components/auth/login-form";
import { GuillocheCanvas } from "@/components/guilloche/guilloche-canvas";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      {/*
        Static field first, live plate over it. If WebGL2 is missing, the canvas
        stays transparent and this is what remains — quieter, never broken.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--now-tint)_0%,var(--paper)_62%)]"
      />
      <GuillocheCanvas className="absolute inset-0 h-full w-full" />

      <div className="relative w-full max-w-[340px]">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-[52px] leading-none tracking-[-0.02em] text-ink">
            Ledger
          </h1>
          {/*
            The product's thesis, not a tagline — the one sentence that separates
            this from every rear-view accounting tool.
          */}
          <p className="mx-auto mt-4 max-w-[270px] text-[13px] leading-relaxed text-muted">
            Know what&apos;s owed, what&apos;s due, and what&apos;s safe to spend.
          </p>
        </div>

        <div className="rounded-card border border-rule-strong bg-surface/95 p-5 shadow-overlay backdrop-blur-2xl">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
