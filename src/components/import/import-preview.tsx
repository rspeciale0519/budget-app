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
  accountName,
  onToggle,
  onToggleTransfer,
  onCommit,
  onUndo,
  onBack,
  onDateOverride,
  batchId,
  categorizedCount,
  busy,
}: {
  rows: SerializableRow[];
  summary: ImportSummary;
  reconcile: { computed: string; reported: string; mismatch: boolean } | null;
  skip: Set<number>;
  accountName?: string;
  onToggle: (i: number) => void;
  onToggleTransfer: (i: number) => void;
  onCommit: () => void;
  onUndo: () => void;
  onBack: () => void;
  onDateOverride: (i: number, date: string) => void;
  batchId: string | null;
  categorizedCount: number;
  busy: boolean;
}) {
  const isDateError = (e: string) => e.startsWith("Cannot parse date") || e.startsWith("Invalid calendar date");
  const dateErrors = rows.some((r) => r.errors.some(isDateError));
  const committable = rows.filter((r, i) => !skip.has(i) && r.errors.length === 0).length;
  const transferCount = rows.filter((r) => r.isTransfer).length;
  const allDuplicates =
    committable === 0 && summary.total > 0 && summary.duplicateCount === summary.total;
  const RENDER_CAP = 200;
  const shown = rows.slice(0, RENDER_CAP);
  const hiddenCount = rows.length - shown.length;

  if (batchId) {
    const stillNeed = committable - categorizedCount;
    const into = accountName ? ` into ${accountName}` : "";
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg bg-credit-tint p-4">
        <p className="text-sm font-semibold text-credit">
          ✓ {committable} transaction{committable === 1 ? "" : "s"} imported{into}.
        </p>
        {categorizedCount > 0 && stillNeed > 0 ? (
          <p className="text-xs text-ink/85">
            Your rules categorized {categorizedCount} automatically — {stillNeed} still need a home.
          </p>
        ) : categorizedCount > 0 && stillNeed === 0 ? (
          <p className="text-xs text-ink/85">Your rules categorized all of them. Nothing to do. ✓</p>
        ) : null}
        <button
          type="button"
          onClick={onUndo}
          disabled={busy}
          className="text-xs font-medium text-muted underline hover:text-ink disabled:opacity-50"
        >
          Undo this import
        </button>
      </div>
    );
  }

  if (allDuplicates) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-credit-tint p-4 text-sm font-semibold text-credit">
          Everything in this file is already in this book — nothing new to import. ✓
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accountName && (
        <p className="text-xs text-muted">
          Importing into <span className="font-semibold text-ink">{accountName}</span>.
        </p>
      )}
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

      {transferCount > 0 && (
        <p className="text-xs text-muted">
          {transferCount} row{transferCount === 1 ? "" : "s"} look like account transfers and won&apos;t
          count as spending — tap a “↔ transfer” tag to change it.
        </p>
      )}

      {dateErrors && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-alert-tint px-3 py-2 text-sm text-alert">
          <span>
            Some dates don&apos;t match the chosen format — pick the correct date right on each row
            below, or go back and try a different date format for all of them.
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
          const dateError = r.errors.some(isDateError);
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
                    {dateError ? (
                      <input
                        type="date"
                        aria-label={`Fix date for row ${i + 1}`}
                        className="rounded border border-alert/50 bg-alert-tint px-1 py-0.5 text-xs text-ink"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.value) onDateOverride(i, e.target.value);
                        }}
                      />
                    ) : (
                      <span className="text-dim">{r.date || "??"}</span>
                    )}
                    <span className="truncate font-medium text-ink">
                      {r.description}
                    </span>
                    {r.category && (
                      <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        {r.category}
                      </span>
                    )}
                    {r.isTransfer && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleTransfer(i);
                        }}
                        title="Not a transfer? Tap to count it as normal spending/income"
                        className="rounded bg-now-tint px-1.5 py-0.5 text-[10px] font-medium text-now hover:bg-now hover:text-paper"
                      >
                        ↔ transfer ✕
                      </button>
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
