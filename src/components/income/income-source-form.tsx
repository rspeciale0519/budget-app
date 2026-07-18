"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import {
  addIncomeSourceAction,
  deleteIncomeSourceAction,
} from "@/app/(app)/w/[workspaceId]/_actions";
import { useToast } from "@/components/ui/toast";

export interface IncomeSourceView {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  nextDate: string;
}

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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { toast } = useToast();

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
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    setConfirmingId(null);
    setRemovingId(id);
    const result = await deleteIncomeSourceAction(workspaceId, id);
    setRemovingId(null);
    if (result.ok) {
      toast("Income source removed");
      router.refresh();
    } else {
      toast(result.error ?? "Could not remove that income source.", { kind: "error" });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add expected income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Name (e.g. Salary, Retainer)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
          <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          {error && <p className="text-sm text-alert">{error}</p>}
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
            <div className="rounded-xl border border-dashed border-rule bg-surface p-6 text-center">
              <h3 className="text-sm font-semibold text-ink">No expected income yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Add your paycheck or other regular income so Safe to spend can look ahead. Until
                then it uses a 30-day window.
              </p>
            </div>
          ) : (
            sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-rule py-1.5">
                <span className="text-ink/85">
                  {s.name} · {s.frequency} · next {s.nextDate}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular text-ink">${s.amount}</span>
                  <Button
                    variant={confirmingId === s.id ? "danger" : "ghost"}
                    size="sm"
                    disabled={removingId === s.id}
                    onClick={() => remove(s.id)}
                    onBlur={() => setConfirmingId(null)}
                  >
                    {removingId === s.id ? "Removing…" : confirmingId === s.id ? "Remove?" : "Remove"}
                  </Button>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
