"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, AmountInput, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { money, format } from "@/lib/money";
import {
  setTransactionCategoryAction,
  updateTransactionAction,
  deleteTransactionAction,
  markTransferAction,
  createRuleFromTransactionAction,
} from "@/app/(app)/w/[workspaceId]/transactions/_actions";
import type { CategoryOption } from "@/components/transactions/transactions-view";

export interface TransactionRowData {
  id: string;
  date: string;
  description: string;
  merchant: string | null;
  amount: string;
  categoryId: string | null;
  isTransfer: boolean;
}

export function TransactionRow({
  workspaceId,
  row,
  categories,
}: {
  workspaceId: string;
  row: TransactionRowData;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [date, setDate] = useState(row.date);
  const [amount, setAmount] = useState(row.amount);
  const [description, setDescription] = useState(row.description);

  const income = !row.amount.startsWith("-");

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast(successMsg);
      router.refresh();
    } else {
      toast(res.error ?? "That didn't work — try again.", { kind: "error" });
    }
  }

  async function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setConfirmingDelete(false);
    await act(() => deleteTransactionAction(workspaceId, row.id), "Transaction deleted");
  }

  return (
    <>
      <tr className="border-b border-rule last:border-b-0">
        <td className="whitespace-nowrap px-3 py-2 text-ink/85">{row.date}</td>
        <td className="max-w-[280px] truncate px-3 py-2 text-ink" title={row.description}>
          {row.description}
          {row.isTransfer && (
            <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-[11px] text-muted">
              Transfer
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          {row.isTransfer ? (
            <span
              className="text-xs text-muted"
              title="Transfers are left out of income and spending totals"
            >
              Transfer — not counted
            </span>
          ) : (
            <Select
              aria-label={`Category for ${row.description}`}
              className="h-8 w-auto min-w-[9rem] text-xs"
              value={row.categoryId ?? ""}
              disabled={busy}
              onChange={(e) =>
                act(
                  () => setTransactionCategoryAction(workspaceId, row.id, e.target.value || null),
                  e.target.value ? "Category updated" : "Category cleared",
                )
              }
            >
              <option value="">Uncategorized</option>
              <optgroup label="Spending">
                {categories
                  .filter((c) => c.kind === "expense")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Income">
                {categories
                  .filter((c) => c.kind === "income")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
              {categories
                .filter((c) => c.kind !== "expense" && c.kind !== "income")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          )}
        </td>
        <td className={`whitespace-nowrap px-3 py-2 text-right tabular ${income ? "text-credit" : "text-ink"}`}>
          {format(money(row.amount))}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right">
          <div className="inline-flex items-center gap-1">
            {row.categoryId && !row.isTransfer && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                title="Automatically use this category for future transactions like this one"
                onClick={() =>
                  act(
                    () => createRuleFromTransactionAction(workspaceId, row.description, row.categoryId!),
                    `Rule saved — “${row.description}” will use this category from now on`,
                  )
                }
              >
                Always
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              title="Transfers are left out of income and spending totals"
              onClick={() =>
                act(
                  () => markTransferAction(workspaceId, row.id, !row.isTransfer),
                  row.isTransfer ? "No longer marked as a transfer" : "Marked as a transfer",
                )
              }
            >
              {row.isTransfer ? "Not a transfer" : "Transfer"}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing((v) => !v)}>
              {editing ? "Close" : "Edit"}
            </Button>
            <Button
              variant={confirmingDelete ? "danger" : "ghost"}
              size="sm"
              disabled={busy}
              onClick={remove}
              onBlur={() => setConfirmingDelete(false)}
            >
              {confirmingDelete ? "Delete?" : "Delete"}
            </Button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-rule bg-sunken/50">
          <td colSpan={5} className="px-3 py-2">
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  () => updateTransactionAction(workspaceId, row.id, { date, amount, description }),
                  "Transaction updated",
                ).then(() => setEditing(false));
              }}
            >
              <Input
                aria-label="Date"
                type="date"
                className="w-auto"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                aria-label="Description"
                className="w-auto min-w-[12rem] flex-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <AmountInput
                aria-label="Amount"
                className="w-auto min-w-[7rem]"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={busy}>
                Save
              </Button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
