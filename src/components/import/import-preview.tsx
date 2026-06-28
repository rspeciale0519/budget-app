"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
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
  batchId: string | null;
  busy: boolean;
}) {
  const committable = rows.filter((r, i) => !skip.has(i) && r.errors.length === 0).length;
  const RENDER_CAP = 200;
  const shown = rows.slice(0, RENDER_CAP);
  const hiddenCount = rows.length - shown.length;

  if (batchId) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-pos/10 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-pos">
          <CheckCircle2 className="size-4" aria-hidden />
          Imported {committable} transaction{committable === 1 ? "" : "s"}.
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
        <Chip n={summary.newCount} label="new" tone="bg-pos/15 text-pos" />
        {summary.duplicateCount > 0 && (
          <Chip n={summary.duplicateCount} label="duplicate" tone="bg-amber/15 text-amber" />
        )}
        {summary.errorCount > 0 && (
          <Chip n={summary.errorCount} label="with errors" tone="bg-neg/15 text-neg" />
        )}
        <span className="text-xs text-muted">{summary.total} rows in file</span>
      </div>

      {reconcile?.mismatch && (
        <p className="flex items-start gap-2 rounded-md bg-amber/10 px-3 py-2 text-sm text-amber">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Balance check: after import the math comes to {reconcile.computed}, but the file&apos;s
            last running balance is {reconcile.reported}. Some rows may be missing or mis-mapped.
          </span>
        </p>
      )}

      <p className="text-xs text-muted">
        Duplicates and error rows are unchecked by default. Check a row to include it.
      </p>

      <div className="max-h-[26rem] divide-y divide-line/60 overflow-y-auto rounded-md border border-line">
        {shown.map((r, i) => {
          const negative = r.amount.startsWith("-");
          return (
            <label
              key={i}
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-bg-elev"
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
                    <span className="text-muted">{r.date || "??"}</span>
                    <span className="truncate font-medium text-ink">
                      {r.description}
                    </span>
                    {r.category && (
                      <span className="rounded bg-bg-elev px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        {r.category}
                      </span>
                    )}
                    {r.isTransfer && (
                      <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        transfer
                      </span>
                    )}
                    {r.isDuplicate && (
                      <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[10px] font-medium text-amber">
                        duplicate
                      </span>
                    )}
                  </span>
                  {r.errors.length > 0 && (
                    <span className="block text-[11px] text-neg">{r.errors.join(", ")}</span>
                  )}
                </span>
              </span>
              <span className={`shrink-0 tabular-nums ${negative ? "text-neg" : "text-ink"}`}>
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
