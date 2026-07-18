import Link from "next/link";

/** What a brand-new (zero-account) workspace shows instead of a wall of zeros. */
export function FirstRun({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="rounded-card border border-dashed border-rule bg-surface p-10 text-center">
      <h2 className="text-lg font-semibold text-ink">Let&apos;s set up your money</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Add a bank or credit account, or import transactions straight from your bank&apos;s CSV
        export. Your dashboard fills in from there.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href={`/w/${workspaceId}/manage`}
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
