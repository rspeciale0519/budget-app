"use client";

import { Button } from "@/components/ui/button";
import type { SerializableRow, ImportSummary } from "@/app/(app)/w/[workspaceId]/import/_actions";

function Chip({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {n} {label}
    </span>
  );
}

export function ImportPreview({
  rows,
  summary,
  reconcile,
  skip,
  onToggle,
  onCommit,
  onUndo,
  onBack,
  batchId,
  busy,
}: {
  rows: SerializableRow[];
  summary: ImportSummary;
  reconcile: { computed: string; reported: string; mismatch: boolean } | null;
  skip: Set<number>;
  onToggle: (i: number) => void;
  onCommit: () => void;
  onUndo: () => void;
  onBack: () => void;
  batchId: string | null;
  busy: boolean;
}) {
  const dateErrors = rows.some((r) => r.errors.some((e) => e.startsWith("Cannot parse date")));
  const committable = rows.filter((r, i) => !skip.has(i) && r.errors.length === 0).length;
  const RENDER_CAP = 200;
  const shown = rows.slice(0, RENDER_CAP);
  const hiddenCount = rows.length - shown.length;

  if (batchId) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-credit-tint p-4">
        <p className="text-sm font-semibold text-credit">
          ✓ Imported {committable} transaction{committable === 1 ? "" : "s"}.
        </p>
        <p className="text-xs text-muted">Batch {batchId.slice(0, 8)}… · changed your mind?</p>
        <Button variant="outline" onClick={onUndo} disabled={busy}>
          Undo this import
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip n={summary.newCount} label="new" tone="bg-credit-tint text-credit" />
        {summary.duplicateCount > 0 && (
          <Chip n={summary.duplicateCount} label="duplicate" tone="bg-debit-tint text-debit" />
        )}
        {summary.errorCount > 0 && (
          <Chip n={summary.errorCount} label="with errors" tone="bg-alert-tint text-alert" />
        )}
        <span className="text-xs text-dim">{summary.total} rows in file</span>
      </div>

      {dateErrors && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-alert-tint px-3 py-2 text-sm text-alert">
          <span>
            Some dates don&apos;t match the chosen format — go back a step and try a different date
            format.
          </span>
          <Button variant="outline" size="sm" onClick={onBack} disabled={busy}>
            ← Back to columns
          </Button>
        </div>
      )}

      {reconcile?.mismatch && (
        <p className="rounded-control bg-debit-tint px-3 py-2 text-sm text-debit">
          ⚠ Balance check: after import the math comes to {reconcile.computed}, but the file&apos;s
          last running balance is {reconcile.reported}. Some rows may be missing or mis-mapped.
        </p>
      )}

      <p className="text-xs text-muted">
        Duplicates and error rows are unchecked by default. Check a row to include it.
      </p>

      <div className="max-h-[26rem] divide-y divide-rule overflow-y-auto rounded-control border border-rule">
        {shown.map((r, i) => {
          const negative = r.amount.startsWith("-");
          return (
            <label
              key={i}
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-raised"
            >
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={!skip.has(i)}
                  onChange={() => onToggle(i)}
                  disabled={r.errors.length > 0}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-dim">{r.date || "??"}</span>
                    <span className="truncate font-medium text-ink">
                      {r.description}
                    </span>
                    {r.category && (
                      <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        {r.category}
                      </span>
                    )}
                    {r.isTransfer && (
                      <span className="rounded bg-now-tint px-1.5 py-0.5 text-[10px] font-medium text-now">
                        transfer
                      </span>
                    )}
                    {r.isDuplicate && (
                      <span className="rounded bg-debit-tint px-1.5 py-0.5 text-[10px] font-medium text-debit">
                        duplicate
                      </span>
                    )}
                  </span>
                  {r.errors.length > 0 && (
                    <span className="block text-[11px] text-alert">{r.errors.join(", ")}</span>
                  )}
                </span>
              </span>
              <span className={`shrink-0 tabular-nums ${negative ? "text-debit" : "text-ink"}`}>
                {r.amount}
              </span>
            </label>
          );
        })}
        {hiddenCount > 0 && (
          <p className="px-3 py-2 text-xs text-muted">
            + {hiddenCount} more row{hiddenCount === 1 ? "" : "s"} not shown — all are included
            unless flagged as duplicate or error above.
          </p>
        )}
      </div>

      <Button disabled={busy || committable === 0} onClick={onCommit}>
        Import {committable} transaction{committable === 1 ? "" : "s"}
      </Button>
    </div>
  );
}
