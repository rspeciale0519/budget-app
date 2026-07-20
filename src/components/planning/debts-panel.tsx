"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, AmountInput, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  addDebtAction,
  deleteDebtAction,
  updateDebtAction,
  recordDebtPaymentAction,
  type ActionResult,
} from "@/app/(app)/w/[workspaceId]/_actions";
import type { AccountOption } from "@/components/planning/goals-panel";

export interface DebtRow {
  id: string;
  name: string;
  balance: string;
  apr: string;
  minimum: string;
  dueDay: number;
  linked: boolean;
  accountName: string | null;
  payoff: string;
  minimumRaw: string;
}

const DEBT_TYPES = [
  { value: "credit_card", label: "Credit card" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
];

function useAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<ActionResult>, ok: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast(ok);
      router.refresh();
      return true;
    }
    toast(res.error ?? "That didn't work — try again.", { kind: "error" });
    return false;
  }
  return { busy, run };
}

function AddDebtForm({ workspaceId, accounts }: { workspaceId: string; accounts: AccountOption[] }) {
  const { busy, run } = useAction();
  const [name, setName] = useState("");
  const [type, setType] = useState("credit_card");
  const [apr, setApr] = useState("");
  const [minimum, setMinimum] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [accountId, setAccountId] = useState("");
  const [balance, setBalance] = useState("");

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="debt-name">Debt</Label>
        <Input id="debt-name" className="w-auto min-w-[9rem]" placeholder="e.g. Visa" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="debt-type">Type</Label>
        <Select id="debt-type" className="w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          {DEBT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="debt-apr">APR %</Label>
        <AmountInput id="debt-apr" className="w-auto min-w-[5rem]" placeholder="19.99" value={apr} onChange={(e) => setApr(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="debt-min">Min payment</Label>
        <AmountInput id="debt-min" className="w-auto min-w-[6rem]" placeholder="50.00" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="debt-due">Due day</Label>
        <Input id="debt-due" type="number" min={1} max={31} className="w-auto min-w-[4.5rem]" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="debt-account">Track a card/loan account (optional)</Label>
        <Select id="debt-account" className="w-auto min-w-[10rem]" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Track manually</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </div>
      {accountId === "" && (
        <div className="space-y-1">
          <Label htmlFor="debt-balance">Amount owed</Label>
          <AmountInput id="debt-balance" className="w-auto min-w-[7rem]" placeholder="2000.00" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </div>
      )}
      <Button
        disabled={busy || name.trim() === "" || apr.trim() === "" || minimum.trim() === ""}
        onClick={() =>
          run(
            () =>
              addDebtAction(workspaceId, {
                name,
                type,
                apr,
                minimumPayment: minimum,
                dueDay: Number(dueDay),
                accountId: accountId || undefined,
                currentBalance: accountId ? undefined : balance || "0",
              }),
            "Debt added",
          ).then((ok) => {
            if (ok) {
              setName("");
              setApr("");
              setMinimum("");
              setBalance("");
              setAccountId("");
            }
          })
        }
      >
        Add debt
      </Button>
    </div>
  );
}

function DebtItem({ workspaceId, debt }: { workspaceId: string; debt: DebtRow }) {
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [minimum, setMinimum] = useState(debt.minimumRaw);

  return (
    <div className="space-y-1.5 rounded-control bg-raised/30 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold text-ink">{debt.name}</span>
          <span className="text-xs text-muted">{debt.apr} · min {debt.minimum} · due day {debt.dueDay}</span>
          {debt.linked && debt.accountName && (
            <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">Tracks {debt.accountName}</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="tabular font-semibold text-ink">{debt.balance}</span>
          {!debt.linked && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setPaying((v) => !v)}>
              Record payment
            </Button>
          )}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </Button>
          <Button
            variant={confirming ? "danger" : "ghost"}
            size="sm"
            disabled={busy}
            onBlur={() => setConfirming(false)}
            onClick={() => {
              if (!confirming) return setConfirming(true);
              setConfirming(false);
              void run(() => deleteDebtAction(workspaceId, debt.id), "Debt removed");
            }}
          >
            {confirming ? "Remove?" : "Remove"}
          </Button>
        </span>
      </div>
      <p className="text-[11px] text-muted">{debt.payoff}</p>
      {paying && !debt.linked && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => recordDebtPaymentAction(workspaceId, debt.id, amount), "Payment recorded").then((ok) => {
              if (ok) {
                setAmount("");
                setPaying(false);
              }
            });
          }}
        >
          <AmountInput aria-label={`Payment on ${debt.name}`} className="h-8 w-28 text-xs" placeholder="100.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button type="submit" size="sm" disabled={busy || amount.trim() === ""}>Record</Button>
        </form>
      )}
      {editing && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateDebtAction(workspaceId, debt.id, { minimumPayment: minimum }), "Debt updated").then((ok) => ok && setEditing(false));
          }}
        >
          <Label htmlFor={`dm-${debt.id}`} className="text-xs">Min payment</Label>
          <AmountInput id={`dm-${debt.id}`} className="h-8 w-24 text-xs" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
          <Button type="submit" size="sm" disabled={busy}>Save</Button>
        </form>
      )}
    </div>
  );
}

export function DebtsPanel({
  workspaceId,
  debts,
  total,
  accounts,
}: {
  workspaceId: string;
  debts: DebtRow[];
  total: string;
  accounts: AccountOption[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle note={debts.length > 0 ? `total ${total}` : undefined}>Debts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AddDebtForm workspaceId={workspaceId} accounts={accounts} />
        {debts.length === 0 ? (
          <p className="py-2 text-sm text-muted">
            No debts tracked — add a card or loan (link its account to track the balance live, or enter
            the amount owed to track it manually).
          </p>
        ) : (
          <div className="space-y-2">
            {debts.map((d) => (
              <DebtItem key={d.id} workspaceId={workspaceId} debt={d} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
