"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, AmountInput, Select, FieldError } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { today } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import {
  addAccountAction,
  addTransactionAction,
  addBillAction,
  type ActionResult,
} from "@/app/(app)/w/[workspaceId]/_actions";

interface AccountOption {
  id: string;
  name: string;
}

const ACCOUNT_TYPES: { value: string; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit card" },
  { value: "loan", label: "Loan" },
  { value: "cash", label: "Cash" },
];

function useAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(fn: () => Promise<ActionResult>, onSuccess?: () => void) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That didn't save — check the fields and try again.");
      return;
    }
    toast("Saved");
    onSuccess?.();
    router.refresh();
  }
  return { error, busy, submit };
}

const ADD_TARGET: Record<string, string> = {
  account: "acct-name",
  transaction: "txn-account",
  bill: "bill-vendor",
};

export function ManageForms({
  workspaceId,
  accounts,
}: {
  workspaceId: string;
  accounts: AccountOption[];
}) {
  // Deep-links (⌘K quick actions, the first-run hero) land here with ?add=…, so
  // scroll to and focus the matching form instead of dropping the user at the top.
  const params = useSearchParams();
  useEffect(() => {
    const targetId = ADD_TARGET[params.get("add") ?? ""];
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [params]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <AccountForm workspaceId={workspaceId} />
      <TransactionForm workspaceId={workspaceId} accounts={accounts} />
      <BillForm workspaceId={workspaceId} />
    </div>
  );
}

function AccountForm({ workspaceId }: { workspaceId: string }) {
  const { error, busy, submit } = useAction();
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState("checking");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingDate, setOpeningDate] = useState<string>(today());
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="acct-name">Name</Label>
          <Input id="acct-name" placeholder="e.g. Everyday Checking" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="acct-institution">Bank or institution</Label>
          <Input id="acct-institution" placeholder="e.g. Chase" value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="acct-type">Type</Label>
          <Select id="acct-type" value={type} onChange={(e) => setType(e.target.value)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="acct-balance">Opening balance</Label>
          <AmountInput id="acct-balance" placeholder="0.00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="acct-date">As of date</Label>
          <Input id="acct-date" type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button
          disabled={busy}
          onClick={() =>
            submit(
              () => addAccountAction(workspaceId, { name, type, institution, openingBalance: openingBalance || "0.00", openingDate }),
              () => {
                setName("");
                setInstitution("");
                setOpeningBalance("");
                document.getElementById("acct-name")?.focus();
              },
            )
          }
          className="w-full"
        >
          Add account
        </Button>
      </CardContent>
    </Card>
  );
}

function TransactionForm({ workspaceId, accounts }: { workspaceId: string; accounts: AccountOption[] }) {
  const { error, busy, submit } = useAction();
  const [accountId, setAccountId] = useState("");
  // Fall back to the first account so a freshly-added account is selectable
  // without a manual re-pick after router.refresh().
  const effectiveAccountId = accountId || accounts[0]?.id || "";
  const [date, setDate] = useState<string>(today());
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [description, setDescription] = useState("");

  const toggleCls = (active: boolean) =>
    cn(
      "flex-1 rounded-control border px-2 py-1.5 text-xs font-semibold transition-colors",
      active
        ? "border-ink bg-ink text-paper"
        : "border-rule-strong bg-surface text-muted hover:border-dim hover:text-ink",
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="txn-account">Account</Label>
          <Select id="txn-account" value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.length === 0 ? <option value="">No accounts yet</option> : null}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="txn-date">Date</Label>
          <Input id="txn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Money direction">
          <button type="button" className={toggleCls(direction === "out")} onClick={() => setDirection("out")}>
            Money out
          </button>
          <button type="button" className={toggleCls(direction === "in")} onClick={() => setDirection("in")}>
            Money in
          </button>
        </div>
        <div className="space-y-1">
          <Label htmlFor="txn-amount">Amount</Label>
          <AmountInput id="txn-amount" placeholder="25.50" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-[11px] text-muted">Just the number — the buttons above set the direction.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="txn-desc">Description</Label>
          <Input id="txn-desc" placeholder="e.g. Groceries at Costco" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button
          disabled={busy || !effectiveAccountId || amount.trim() === ""}
          onClick={() => {
            const magnitude = amount.trim().replace(/^-/, "");
            const signed = direction === "out" ? `-${magnitude}` : magnitude;
            void submit(
              () => addTransactionAction(workspaceId, { accountId: effectiveAccountId, date, amount: signed, description }),
              () => {
                setAmount("");
                setDescription("");
                document.getElementById("txn-amount")?.focus();
              },
            );
          }}
          className="w-full"
        >
          Add transaction
        </Button>
      </CardContent>
    </Card>
  );
}

function BillForm({ workspaceId }: { workspaceId: string }) {
  const { error, busy, submit } = useAction();
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState<string>(today());
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add bill</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="bill-vendor">Who you pay</Label>
          <Input id="bill-vendor" placeholder="e.g. Electric Co" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bill-amount">Amount</Label>
          <AmountInput id="bill-amount" placeholder="120.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bill-due">Due date</Label>
          <Input id="bill-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button
          disabled={busy || vendor.trim() === "" || amount.trim() === ""}
          onClick={() =>
            submit(
              () => addBillAction(workspaceId, { vendor, amount, dueDate }),
              () => {
                setVendor("");
                setAmount("");
                document.getElementById("bill-vendor")?.focus();
              },
            )
          }
          className="w-full"
        >
          Add bill
        </Button>
      </CardContent>
    </Card>
  );
}
