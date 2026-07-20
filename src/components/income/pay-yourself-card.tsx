"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, AmountInput, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { today } from "@/lib/calendar-date";
import { tagOwnerDrawAction } from "@/app/(app)/w/[workspaceId]/_actions";

export interface PayTargetBook {
  id: string;
  name: string;
  accounts: { id: string; name: string }[];
}

/** Record an owner draw: money out of this business book, in as income to
 * another of the user's books. Renders only for business books that have a
 * valid destination (enforced by the page). */
export function PayYourselfCard({
  workspaceId,
  targets,
  fromAccounts,
}: {
  workspaceId: string;
  targets: PayTargetBook[];
  fromAccounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [toBookId, setToBookId] = useState(targets[0]!.id);
  const toBook = targets.find((t) => t.id === toBookId) ?? targets[0]!;
  const [toAccountId, setToAccountId] = useState(toBook.accounts[0]!.id);
  const [fromAccountId, setFromAccountId] = useState(fromAccounts[0]!.id);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string>(today());
  const [busy, setBusy] = useState(false);

  // Keep the account choice valid when the destination book changes.
  const effectiveToAccountId = toBook.accounts.some((a) => a.id === toAccountId)
    ? toAccountId
    : toBook.accounts[0]!.id;

  async function pay() {
    setBusy(true);
    const res = await tagOwnerDrawAction(workspaceId, {
      toWorkspaceId: toBook.id,
      toAccountId: effectiveToAccountId,
      fromAccountId,
      amount,
      date,
    });
    setBusy(false);
    if (res.ok) {
      setAmount("");
      toast(`Paid yourself ✓ — money moved to ${toBook.name}.`);
      router.refresh();
    } else {
      toast(res.error ?? "Could not record that — try again.", { kind: "error" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay yourself</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void pay();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="py-from">From account</Label>
            <Select id="py-from" className="w-auto min-w-[10rem]" value={fromAccountId} disabled={busy} onChange={(e) => setFromAccountId(e.target.value)}>
              {fromAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="py-book">To book</Label>
            <Select id="py-book" className="w-auto min-w-[9rem]" value={toBookId} disabled={busy} onChange={(e) => setToBookId(e.target.value)}>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="py-account">To account</Label>
            <Select id="py-account" className="w-auto min-w-[10rem]" value={effectiveToAccountId} disabled={busy} onChange={(e) => setToAccountId(e.target.value)}>
              {toBook.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="py-amount">Amount</Label>
            <AmountInput id="py-amount" className="w-auto min-w-[7rem]" placeholder="1000.00" value={amount} disabled={busy} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="py-date">Date</Label>
            <Input id="py-date" type="date" className="w-auto" value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy || amount.trim() === ""}>
            {busy ? "Recording…" : "Pay yourself"}
          </Button>
        </form>
        <p className="text-xs text-muted">
          Recorded once in each book — the combined view never double-counts it.
        </p>
      </CardContent>
    </Card>
  );
}
