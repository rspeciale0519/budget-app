"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setBudgetAction } from "@/app/(app)/w/[workspaceId]/budget/_actions";
import type { BudgetRow } from "@/services/dashboard/budget-vs-actual";

interface CategoryOption {
  id: string;
  name: string;
}

const BAR: Record<BudgetRow["status"], string> = {
  under: "bg-[#2563eb]",
  near: "bg-[#f59e0b]",
  over: "bg-[#dc2626]",
};

const inputCls = "rounded-md border border-slate-300 px-3 py-1.5 text-sm";
const selectCls = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";

function SetBudgetForm({ workspaceId, categories }: { workspaceId: string; categories: CategoryOption[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setBudgetAction(workspaceId, categoryId, amount);
      if (res.ok) {
        setAmount("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not set budget");
      }
    });
  }

  return (
    <Card className="space-y-2 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <select
          aria-label="Category"
          className={selectCls}
          value={categoryId}
          disabled={pending}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Monthly budget amount"
          className={inputCls}
          inputMode="decimal"
          placeholder="Monthly amount"
          value={amount}
          disabled={pending}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button
          variant="primary"
          className="px-3 py-1.5 text-xs"
          disabled={pending || categoryId === "" || amount.trim() === ""}
          onClick={save}
        >
          Set budget
        </Button>
      </div>
      {error && <p className="text-xs font-semibold text-neg">{error}</p>}
    </Card>
  );
}

export function BudgetView({
  workspaceId,
  rows,
  categories,
}: {
  workspaceId: string;
  rows: BudgetRow[];
  categories: CategoryOption[];
}) {
  return (
    <div className="space-y-4">
      <SetBudgetForm workspaceId={workspaceId} categories={categories} />

      <Card className="space-y-4 p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No budgets set yet — add one above.</p>
        ) : (
          rows.map((r) => (
            <div key={r.categoryId} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-ink">{r.name}</span>
                <span className={`tabular ${r.status === "over" ? "font-bold text-neg" : "text-slate-700"}`}>
                  {`${r.actual} / ${r.budget}`}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#eef0f3]">
                <div
                  className={`h-full rounded-full ${BAR[r.status]}`}
                  style={{ width: `${Math.min(r.pct, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
