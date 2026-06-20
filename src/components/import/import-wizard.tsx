"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MappingConfig } from "@/services/import";
import {
  previewImportAction,
  commitImportAction,
  undoImportAction,
  type SerializableRow,
} from "@/app/(app)/w/[workspaceId]/import/_actions";

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

const SAMPLE = "Date,Description,Amount,Balance\n06/19/2026,Paycheck,500.00,1500.00\n06/20/2026,Groceries,-40.00,1460.00";

export function ImportWizard({
  workspaceId,
  accounts,
}: {
  workspaceId: string;
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [csvText, setCsvText] = useState(SAMPLE);
  const [dateCol, setDateCol] = useState("Date");
  const [descCol, setDescCol] = useState("Description");
  const [amountCol, setAmountCol] = useState("Amount");
  const [balanceCol, setBalanceCol] = useState("Balance");
  const [signRule, setSignRule] = useState<MappingConfig["signRule"]>("single_signed");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  const [rows, setRows] = useState<SerializableRow[] | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [reconcile, setReconcile] = useState<PreviewState["reconcile"]>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function mapping(): MappingConfig {
    return {
      columnMap: {
        date: dateCol,
        description: descCol,
        amount: amountCol,
        runningBalance: balanceCol || undefined,
      },
      signRule,
      dateFormat,
    };
  }

  async function preview() {
    setBusy(true);
    setError(null);
    setBatchId(null);
    const result = await previewImportAction(accountId, csvText, mapping());
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Preview failed");
      setRows(null);
      return;
    }
    setRows(result.rows);
    setReconcile(result.reconcile);
    setSkip(new Set(result.rows.flatMap((r, i) => (r.skip ? [i] : []))));
  }

  async function commit() {
    setBusy(true);
    setError(null);
    const result = await commitImportAction(workspaceId, accountId, "import.csv", csvText, mapping(), [...skip]);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Commit failed");
    else {
      setBatchId(result.batchId ?? null);
      setRows(null);
      router.refresh();
    }
  }

  async function undo() {
    if (!batchId) return;
    setBusy(true);
    await undoImportAction(workspaceId, batchId);
    setBusy(false);
    setBatchId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload &amp; map</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.length === 0 ? <option value="">No accounts — add one first</option> : null}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <textarea className={`${inputCls} h-28 font-mono`} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <input className={inputCls} value={dateCol} onChange={(e) => setDateCol(e.target.value)} placeholder="Date column" />
            <input className={inputCls} value={descCol} onChange={(e) => setDescCol(e.target.value)} placeholder="Description column" />
            <input className={inputCls} value={amountCol} onChange={(e) => setAmountCol(e.target.value)} placeholder="Amount column" />
            <input className={inputCls} value={balanceCol} onChange={(e) => setBalanceCol(e.target.value)} placeholder="Balance column (optional)" />
            <select className={inputCls} value={signRule} onChange={(e) => setSignRule(e.target.value as MappingConfig["signRule"])}>
              <option value="single_signed">single_signed</option>
              <option value="separate_debit_credit">separate_debit_credit</option>
              <option value="invert">invert (credit card)</option>
            </select>
            <select className={inputCls} value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={busy || !accountId} onClick={preview}>Preview</Button>
          {batchId && (
            <div className="flex items-center gap-3 text-sm text-emerald-700">
              <span>✓ Imported. Batch {batchId.slice(0, 8)}…</span>
              <Button variant="outline" onClick={undo} disabled={busy}>Undo import</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {rows && (
        <Card>
          <CardHeader>
            <CardTitle>2. Preview &amp; confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reconcile?.mismatch && (
              <p className="text-sm text-amber-600">
                ⚠ Balance mismatch: computed {reconcile.computed} vs reported {reconcile.reported}
              </p>
            )}
            <div className="space-y-1 text-sm">
              {rows.map((r, i) => (
                <label key={i} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!skip.has(i)}
                      onChange={(e) => {
                        const next = new Set(skip);
                        if (e.target.checked) next.delete(i);
                        else next.add(i);
                        setSkip(next);
                      }}
                    />
                    <span className="text-slate-700">{r.date} · {r.description}</span>
                    {r.isDuplicate && <span className="text-xs text-amber-600">duplicate</span>}
                    {r.errors.length > 0 && <span className="text-xs text-red-600">{r.errors.join(", ")}</span>}
                  </span>
                  <span className="tabular-nums text-slate-900">{r.amount}</span>
                </label>
              ))}
            </div>
            <Button disabled={busy} onClick={commit}>Commit {rows.length - skip.size} rows</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PreviewState {
  reconcile: { computed: string; reported: string; mismatch: boolean } | null;
}
