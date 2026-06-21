"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addIncomeSourceAction,
  deleteIncomeSourceAction,
} from "@/app/(app)/w/[workspaceId]/_actions";

export interface IncomeSourceView {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  nextDate: string;
}

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const FREQUENCIES = ["weekly", "monthly", "quarterly", "annual"];

export function IncomeSourceForm({
  workspaceId,
  sources,
}: {
  workspaceId: string;
  sources: IncomeSourceView[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDate, setNextDate] = useState("2026-07-01");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setError(null);
    const result = await addIncomeSourceAction(workspaceId, { name, amount, frequency, nextDate });
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Failed");
    else {
      setName("");
      router.refresh();
    }
  }

  async function remove(id: string) {
    await deleteIncomeSourceAction(workspaceId, id);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add expected income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <input className={inputCls} placeholder="Name (e.g. Salary, Retainer)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input className={inputCls} type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={busy || !name} onClick={add} className="w-full">
            {busy ? "Adding…" : "Add income source"}
          </Button>
          <p className="text-xs text-muted">
            Expected income sharpens safe-to-spend and the cash-flow forecast.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected income sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {sources.length === 0 ? (
            <p className="text-muted">None yet — safe-to-spend uses a 30-day window.</p>
          ) : (
            sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-line py-1.5">
                <span className="text-slate-700">
                  {s.name} · {s.frequency} · next {s.nextDate}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular text-slate-900">${s.amount}</span>
                  <button onClick={() => remove(s.id)} className="text-xs text-red-600 hover:underline">
                    remove
                  </button>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
