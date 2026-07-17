"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AmountInput, Select, FieldError } from "@/components/ui/field";
import { setBudgetAction } from "@/app/(app)/w/[workspaceId]/budget/_actions";
import type { BudgetRow } from "@/services/dashboard/budget-vs-actual";

interface CategoryOption {
  id: string;
  name: string;
}

// Under budget is fine (neutral now-blue); nearing it is a warm caution;
// over it is the one genuinely-wrong state, so it earns alert-red.
const BAR: Record<BudgetRow["status"], string> = {
  under: "bg-now",
  near: "bg-debit",
  over: "bg-alert",
};

function SetBudgetForm({
  workspaceId,
  categories,
}: {
  workspaceId: string;
  categories: CategoryOption[];
}) {
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
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          aria-label="Category"
          className="w-auto min-w-[10rem]"
          value={categoryId}
          disabled={pending}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <AmountInput
          aria-label="Monthly budget amount"
          className="w-auto min-w-[9rem] flex-1"
          placeholder="Monthly amount"
          value={amount}
          disabled={pending}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button
          variant="primary"
          disabled={pending || categoryId === "" || amount.trim() === ""}
          onClick={save}
        >
          Set budget
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
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

      <Card className="space-y-5 p-5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No budgets set yet — add one above.</p>
        ) : (
          rows.map((r) => (
            <div key={r.categoryId} className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-ink">{r.name}</span>
                <span
                  className={`tabular ${r.status === "over" ? "font-semibold text-alert" : "text-muted"}`}
                >
                  {`${r.actual} / ${r.budget}`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-raised">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${BAR[r.status]}`}
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
