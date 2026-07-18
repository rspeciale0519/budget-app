"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, AmountInput, Select, FieldError } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { addAccountTransferAction } from "@/app/(app)/w/[workspaceId]/_actions";
import { today } from "@/lib/calendar-date";

export function TransferForm({
  workspaceId,
  accounts,
}: {
  workspaceId: string;
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string>(today());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (accounts.length < 2) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await addAccountTransferAction(workspaceId, { fromAccountId, toAccountId, amount, date });
    setBusy(false);
    if (res.ok) {
      setAmount("");
      toast("Transfer recorded");
      router.refresh();
    } else {
      setError(res.error ?? "Could not record the transfer — try again.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Move money between accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="tf-from">From</Label>
            <Select id="tf-from" className="w-auto" value={fromAccountId} disabled={busy} onChange={(e) => setFromAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-to">To</Label>
            <Select id="tf-to" className="w-auto" value={toAccountId} disabled={busy} onChange={(e) => setToAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-amount">Amount</Label>
            <AmountInput
              id="tf-amount"
              className="w-auto min-w-[7rem]"
              placeholder="500.00"
              value={amount}
              disabled={busy}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-date">Date</Label>
            <Input id="tf-date" type="date" className="w-auto" value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy || amount.trim() === "" || fromAccountId === toAccountId}>
            {busy ? "Moving…" : "Move money"}
          </Button>
        </form>
        <p className="text-xs text-muted">
          No minus sign needed — transfers don&apos;t count as income or spending.
        </p>
        {error && <FieldError>{error}</FieldError>}
      </CardContent>
    </Card>
  );
}
