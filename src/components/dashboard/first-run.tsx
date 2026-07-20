import Link from "next/link";

/** What a brand-new (zero-account) workspace shows instead of a wall of zeros. */
export function FirstRun({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="rounded-card border border-dashed border-rule bg-surface p-10 text-center">
      <span className="mx-auto mb-4 grid h-9 w-9 place-items-center overflow-hidden rounded-[9px] bg-gradient-to-br from-now to-credit">
        <span className="h-px w-full bg-paper/60" />
      </span>
      <h2 className="text-lg font-semibold text-ink">Welcome to Ledger</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        A <b className="font-semibold text-ink">book</b>{" "}is one pot of money — a household or a
        business. This is your first one; rename it in Settings, or add another anytime with ＋.
        Start by adding a bank or credit account, or import transactions straight from your
        bank&apos;s CSV export — your dashboard fills in from there.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href={`/w/${workspaceId}/manage?add=account`}
          className="inline-flex h-9 items-center justify-center rounded-control bg-ink px-3.5 text-[13px] font-medium text-paper hover:opacity-85"
        >
          Add an account
        </Link>
        <Link
          href={`/w/${workspaceId}/import`}
          className="inline-flex h-9 items-center justify-center rounded-control border border-rule-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-dim hover:bg-raised"
        >
          Import from your bank
        </Link>
      </div>
    </div>
  );
}
