import { LoginForm } from "@/components/auth/login-form";
import { LoginBackdrop } from "@/components/login/login-backdrop";
import { FieldError } from "@/components/ui/field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <LoginBackdrop />

      <div className="relative w-full max-w-[340px]">
        <div className="mb-8 text-center">
          <h1 className="text-[52px] font-semibold leading-none tracking-[-0.03em] text-ink">
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

        <div className="rounded-card border border-rule-strong bg-surface/90 p-5 shadow-overlay backdrop-blur-sm">
          {error === "auth" && (
            <div className="mb-3">
              <FieldError>Sign-in link didn&apos;t work — it may have expired. Try again.</FieldError>
            </div>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
