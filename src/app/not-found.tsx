import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-sm space-y-3 text-center">
        <h1 className="text-lg font-semibold text-ink">Page not found</h1>
        <p className="text-sm text-muted">That page doesn&apos;t exist or may have moved.</p>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-control border border-rule-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-dim hover:bg-raised"
        >
          Back to your dashboard
        </Link>
      </div>
    </div>
  );
}
