"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { guessColumns, guessDateFormat, guessSignRule } from "@/lib/import/auto-detect";
import {
  EMPTY_MAPPING,
  isMappingComplete,
  toMappingConfig,
  type DraftMapping,
  type ParsedCsvState,
} from "@/components/import/types";
import { CsvDropZone } from "@/components/import/csv-drop-zone";
import { ColumnMapper } from "@/components/import/column-mapper";
import { ImportPreview } from "@/components/import/import-preview";
import {
  previewImportAction,
  commitImportAction,
  undoImportAction,
  type SerializableRow,
  type ImportSummary,
} from "@/app/(app)/w/[workspaceId]/import/_actions";

type Step = "upload" | "map" | "review";
const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload file" },
  { id: "map", label: "Match columns" },
  { id: "review", label: "Review & import" },
];

const EMPTY_SUMMARY: ImportSummary = { total: 0, newCount: 0, duplicateCount: 0, errorCount: 0 };

function Stepper({ step }: { step: Step }) {
  const active = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              i < active
                ? "bg-credit text-paper"
                : i === active
                  ? "bg-now text-paper"
                  : "bg-raised text-muted"
            }`}
          >
            {i < active ? "✓" : i + 1}
          </span>
          <span className={i === active ? "font-semibold text-ink" : "text-muted"}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && <span className="px-1 text-dim">→</span>}
        </li>
      ))}
    </ol>
  );
}

export function ImportWizard({
  workspaceId,
  accounts,
}: {
  workspaceId: string;
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [parsed, setParsed] = useState<ParsedCsvState | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<DraftMapping>(EMPTY_MAPPING);

  const [rows, setRows] = useState<SerializableRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary>(EMPTY_SUMMARY);
  const [reconcile, setReconcile] = useState<
    { computed: string; reported: string; mismatch: boolean } | null
  >(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [dateOverrides, setDateOverrides] = useState<Record<number, string>>({});
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleLoaded(p: ParsedCsvState) {
    const cols = guessColumns(p.headers);
    const dateSamples = cols.date ? p.rows.slice(0, 8).map((r) => r[cols.date!] ?? "") : [];
    setParsed(p);
    setMapping({
      ...EMPTY_MAPPING,
      date: cols.date ?? "",
      description: cols.description ?? "",
      merchant: cols.merchant ?? "",
      amount: cols.amount ?? "",
      debit: cols.debit ?? "",
      credit: cols.credit ?? "",
      runningBalance: cols.runningBalance ?? "",
      signRule: guessSignRule(cols),
      dateFormat: guessDateFormat(dateSamples),
    });
    setError(null);
    setStep("map");
  }

  // Re-deriving after a date fix resets skip/duplicate flags to server truth
  // (same as the first preview) rather than trying to preserve any manual
  // include/exclude toggles made on other rows in between — simpler and never
  // silently commits something the user didn't just see.
  async function runPreview(overrides: Record<number, string>) {
    if (!parsed) return false;
    setBusy(true);
    setError(null);
    const result = await previewImportAction(
      workspaceId,
      accountId,
      parsed.text,
      toMappingConfig(mapping),
      overrides,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Preview failed");
      return false;
    }
    setRows(result.rows);
    setSummary(result.summary);
    setReconcile(result.reconcile);
    setSkip(new Set(result.rows.flatMap((r, i) => (r.skip ? [i] : []))));
    return true;
  }

  async function preview() {
    setBatchId(null);
    if (await runPreview(dateOverrides)) setStep("review");
  }

  async function applyDateOverride(i: number, date: string) {
    const next = { ...dateOverrides, [i]: date };
    setDateOverrides(next);
    await runPreview(next);
  }

  async function commit() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    const result = await commitImportAction(
      workspaceId,
      accountId,
      fileName ?? "import.csv",
      parsed.text,
      toMappingConfig(mapping),
      [...skip],
      rows.length,
      dateOverrides,
    );
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Import failed");
    else {
      setBatchId(result.batchId ?? null);
      router.refresh();
    }
  }

  async function undo() {
    if (!batchId) return;
    setBusy(true);
    await undoImportAction(workspaceId, batchId);
    setBusy(false);
    setBatchId(null);
    reset();
    router.refresh();
  }

  function reset() {
    setStep("upload");
    setParsed(null);
    setFileName(null);
    setMapping(EMPTY_MAPPING);
    setRows([]);
    setDateOverrides({});
    setBatchId(null);
    setError(null);
  }

  function toggle(i: number) {
    setSkip((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 py-6 text-sm text-muted">
          <p className="font-medium text-ink">Add an account first.</p>
          <p>CSV transactions are imported into an account, and this book has none yet.</p>
          <Link
            href={`/w/${workspaceId}/manage`}
            className="inline-block rounded-control bg-ink px-3 py-2 font-medium text-paper hover:opacity-85"
          >
            Go to Manage → add an account
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{STEPS.find((s) => s.id === step)?.label}</CardTitle>
          {step !== "upload" && !batchId && (
            <button
              type="button"
              onClick={() => setStep(step === "review" ? "map" : "upload")}
              className="text-xs font-medium text-muted hover:text-ink"
            >
              ← Back
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "upload" && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted">Import into account</span>
                <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </label>
              <CsvDropZone onLoaded={handleLoaded} fileName={fileName} onFileName={setFileName} />
            </>
          )}

          {step === "map" && parsed && (
            <>
              <p className="text-xs text-muted">
                We pre-filled these from <span className="font-medium">{fileName}</span> ·{" "}
                {parsed.rows.length} rows. Adjust anything that looks wrong.
              </p>
              <ColumnMapper parsed={parsed} value={mapping} onChange={setMapping} />
              {error && <p className="text-sm text-alert">{error}</p>}
              <Button disabled={busy || !isMappingComplete(mapping)} onClick={preview}>
                {busy ? "Checking…" : "Preview import"}
              </Button>
              {!isMappingComplete(mapping) && (
                <p className="text-[11px] text-dim">
                  Pick a Date, Description, and amount column(s) to continue.
                </p>
              )}
            </>
          )}

          {step === "review" && (
            <>
              {error && <p className="text-sm text-alert">{error}</p>}
              <ImportPreview
                rows={rows}
                summary={summary}
                reconcile={reconcile}
                skip={skip}
                onToggle={toggle}
                onCommit={commit}
                onUndo={undo}
                onBack={() => setStep("map")}
                onDateOverride={applyDateOverride}
                batchId={batchId}
                busy={busy}
              />
              {batchId && (
                <Button variant="outline" onClick={reset}>
                  Import another file
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
