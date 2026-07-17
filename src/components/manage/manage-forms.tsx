"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
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

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(fn: () => Promise<ActionResult>) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }
  return { error, busy, submit };
}

export function ManageForms({
  workspaceId,
  accounts,
}: {
  workspaceId: string;
  accounts: AccountOption[];
}) {
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
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [openingDate, setOpeningDate] = useState("2026-01-01");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {["checking", "savings", "credit_card", "loan", "cash"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Input placeholder="Opening balance" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
        <Input type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
        {error && <p className="text-sm text-alert">{error}</p>}
        <Button disabled={busy} onClick={() => submit(() => addAccountAction(workspaceId, { name, type, institution, openingBalance, openingDate }))} className="w-full">
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
  const [date, setDate] = useState("2026-06-20");
  const [amount, setAmount] = useState("-0.00");
  const [description, setDescription] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.length === 0 ? <option value="">No accounts yet</option> : null}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input placeholder="Amount (e.g. -25.50)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="text-sm text-alert">{error}</p>}
        <Button disabled={busy || !effectiveAccountId} onClick={() => submit(() => addTransactionAction(workspaceId, { accountId: effectiveAccountId, date, amount, description }))} className="w-full">
          Add transaction
        </Button>
      </CardContent>
    </Card>
  );
}

function BillForm({ workspaceId }: { workspaceId: string }) {
  const { error, busy, submit } = useAction();
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [dueDate, setDueDate] = useState("2026-07-01");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add bill</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        {error && <p className="text-sm text-alert">{error}</p>}
        <Button disabled={busy} onClick={() => submit(() => addBillAction(workspaceId, { vendor, amount, dueDate }))} className="w-full">
          Add bill
        </Button>
      </CardContent>
    </Card>
  );
}
