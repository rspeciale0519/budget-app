"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AmountInput, Select, FieldError } from "@/components/ui/field";
import { EmptyState } from "@/components/empty/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  setBudgetAction,
  deleteBudgetAction,
  moveBudgetAction,
} from "@/app/(app)/w/[workspaceId]/budget/_actions";
import type { BudgetRow } from "@/services/dashboard/budget-vs-actual";

interface CategoryOption {
  id: string;
  name: string;
}

export interface BudgetSummary {
  totalBudgeted: string;
  expectedIncome: string;
  incomeConfigured: boolean;
  unbudgeted: string;
  overCommitted: boolean;
  overspentCount: number;
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

function SummaryStrip({ workspaceId, summary }: { workspaceId: string; summary: BudgetSummary }) {
  return (
    <Card className="flex flex-wrap items-center gap-x-8 gap-y-2 p-4 text-sm">
      {summary.incomeConfigured ? (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Expected income
          </div>
          <div className="tabular font-semibold text-ink">{summary.expectedIncome}</div>
        </div>
      ) : (
        <Link
          href={`/w/${workspaceId}/income`}
          className="text-sm font-semibold text-now hover:underline"
        >
          Set expected income to see what&apos;s left to budget →
        </Link>
      )}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Budgeted
        </div>
        <div className="tabular font-semibold text-ink">{summary.totalBudgeted}</div>
      </div>
      {summary.incomeConfigured && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {summary.overCommitted ? "Over-committed by" : "Left to budget"}
          </div>
          <div className={`tabular font-semibold ${summary.overCommitted ? "text-alert" : "text-credit"}`}>
            {summary.unbudgeted}
          </div>
          <div className="text-[11px] text-muted">of {summary.expectedIncome} expected income</div>
        </div>
      )}
      {summary.overspentCount > 0 && (
        <span className="ml-auto text-sm font-medium text-alert">
          {summary.overspentCount} {summary.overspentCount === 1 ? "category" : "categories"} over
          budget
        </span>
      )}
    </Card>
  );
}

function BudgetRowItem({
  workspaceId,
  row,
  others,
  readOnly,
}: {
  workspaceId: string;
  row: BudgetRow;
  others: { categoryId: string; name: string }[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [amount, setAmount] = useState(row.budgetRaw);
  const [moveAmount, setMoveAmount] = useState("");
  const [moveFrom, setMoveFrom] = useState(others[0]?.categoryId ?? "");

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast(successMsg);
      router.refresh();
      return true;
    }
    toast(res.error ?? "That didn't work — try again.", { kind: "error" });
    return false;
  }

  const statusText =
    row.status === "over" ? (
      <span className="font-semibold text-alert">Over by {row.delta}</span>
    ) : (
      <span className="text-muted">{row.delta} left</span>
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="flex items-baseline gap-3">
          <span className="font-semibold text-ink">{row.name}</span>
          {statusText}
          {!readOnly && row.status === "over" && others.length > 0 && (
            <button
              type="button"
              className="text-xs font-semibold text-now hover:underline"
              onClick={() => {
                setMoveAmount(row.delta.replace(/[$,]/g, ""));
                setMoving((v) => !v);
              }}
            >
              cover it
            </button>
          )}
        </span>
        <span className="flex items-center gap-1">
          {editing ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  () => setBudgetAction(workspaceId, row.categoryId, amount),
                  "Budget updated",
                ).then((ok) => ok && setEditing(false));
              }}
            >
              <AmountInput
                aria-label={`Monthly budget for ${row.name}`}
                className="h-8 w-28 text-xs"
                value={amount}
                autoFocus
                onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={busy}>
                Save
              </Button>
            </form>
          ) : readOnly ? (
            <span className="tabular px-1.5 py-0.5 text-sm text-ink">
              {row.actual} of {row.budget}
            </span>
          ) : (
            <button
              type="button"
              className="tabular rounded-md px-1.5 py-0.5 text-sm text-ink transition-colors hover:bg-raised"
              title="Click to change this budget"
              onClick={() => setEditing(true)}
            >
              {row.actual} of {row.budget}
            </button>
          )}
          {!readOnly && (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setMoving((v) => !v)}
              >
                Move
              </Button>
              <Button
                variant={confirmingRemove ? "danger" : "ghost"}
                size="sm"
                disabled={busy}
                onBlur={() => setConfirmingRemove(false)}
                onClick={() => {
                  if (!confirmingRemove) {
                    setConfirmingRemove(true);
                    return;
                  }
                  setConfirmingRemove(false);
                  void act(() => deleteBudgetAction(workspaceId, row.budgetId), "Budget removed");
                }}
              >
                {confirmingRemove ? "Remove?" : "Remove"}
              </Button>
            </>
          )}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={row.pctTrue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${row.name}: ${row.pctTrue}% of budget spent`}
        title={row.status === "near" ? "Getting close — 85% or more of this budget is used" : undefined}
        className="h-2 overflow-hidden rounded-full bg-raised"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${BAR[row.status]}`}
          style={{ width: `${Math.min(row.pct, 100)}%` }}
        />
      </div>
      {moving && (
        <form
          className="flex flex-wrap items-center gap-2 rounded-control bg-sunken/60 p-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void act(
              () => moveBudgetAction(workspaceId, moveFrom, row.categoryId, moveAmount),
              `Moved $${moveAmount} to ${row.name}`,
            ).then((ok) => ok && setMoving(false));
          }}
        >
          <span className="text-muted">Move</span>
          <AmountInput
            aria-label={`Amount to move into ${row.name}`}
            className="h-8 w-24 text-xs"
            placeholder="40.00"
            value={moveAmount}
            onChange={(e) => setMoveAmount(e.target.value)}
          />
          <span className="text-muted">into {row.name} from</span>
          <Select
            aria-label={`Move money from`}
            className="h-8 w-auto min-w-[9rem] text-xs"
            value={moveFrom}
            onChange={(e) => setMoveFrom(e.target.value)}
          >
            {others.map((o) => (
              <option key={o.categoryId} value={o.categoryId}>
                {o.name}
              </option>
            ))}
          </Select>
          <Button type="submit" size="sm" disabled={busy || moveAmount.trim() === "" || moveFrom === ""}>
            Move
          </Button>
        </form>
      )}
    </div>
  );
}

export function BudgetView({
  workspaceId,
  rows,
  categories,
  summary,
  readOnly = false,
}: {
  workspaceId: string;
  rows: BudgetRow[];
  categories: CategoryOption[];
  summary: BudgetSummary;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      {readOnly && (
        <Card className="p-3 text-sm text-muted">
          You&apos;re viewing a past month. Budget amounts are always your current ones — shown here
          against that month&apos;s spending. Switch to this month to make changes.
        </Card>
      )}
      <SummaryStrip workspaceId={workspaceId} summary={summary} />
      {!readOnly && <SetBudgetForm workspaceId={workspaceId} categories={categories} />}

      <Card className="space-y-5 p-5">
        {rows.length === 0 ? (
          <EmptyState
            title="No budgets yet"
            description="Pick a category above and give it a monthly amount. As you spend, its bar fills — red means you went over, and you can move money from another category to cover it."
          />
        ) : (
          rows.map((r) => (
            <BudgetRowItem
              key={r.categoryId}
              workspaceId={workspaceId}
              row={r}
              readOnly={readOnly}
              others={rows
                .filter((o) => o.categoryId !== r.categoryId)
                .map((o) => ({ categoryId: o.categoryId, name: o.name }))}
            />
          ))
        )}
      </Card>
    </div>
  );
}
