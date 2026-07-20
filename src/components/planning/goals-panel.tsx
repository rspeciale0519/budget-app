"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, AmountInput, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  addGoalAction,
  updateGoalAction,
  deleteGoalAction,
  contributeGoalAction,
  type ActionResult,
} from "@/app/(app)/w/[workspaceId]/_actions";

export interface GoalRow {
  id: string;
  name: string;
  target: string;
  saved: string;
  pct: number;
  linked: boolean;
  accountName: string | null;
  reached: boolean;
  insight: string;
  targetRaw: string;
}

export interface AccountOption {
  id: string;
  name: string;
}

function useAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<ActionResult>, ok: string) {
    return runResult(fn, () => ok);
  }
  async function runResult<T extends ActionResult>(fn: () => Promise<T>, ok: (r: T) => string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast(ok(res));
      router.refresh();
      return true;
    }
    toast(res.error ?? "That didn't work — try again.", { kind: "error" });
    return false;
  }
  return { busy, run, runResult };
}

function AddGoalForm({ workspaceId, accounts }: { workspaceId: string; accounts: AccountOption[] }) {
  const { busy, run } = useAction();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="goal-name">Goal</Label>
        <Input id="goal-name" className="w-auto min-w-[10rem]" placeholder="e.g. Vacation fund" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="goal-target">Target</Label>
        <AmountInput id="goal-target" className="w-auto min-w-[7rem]" placeholder="5000.00" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="goal-date">Target date (optional)</Label>
        <Input id="goal-date" type="date" className="w-auto" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="goal-account">Track a savings account (optional)</Label>
        <Select id="goal-account" className="w-auto min-w-[10rem]" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Track manually</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </div>
      <Button
        disabled={busy || name.trim() === "" || target.trim() === ""}
        onClick={() =>
          run(
            () =>
              addGoalAction(workspaceId, {
                name,
                targetAmount: target,
                targetDate: targetDate || undefined,
                accountId: accountId || undefined,
              }),
            "Goal added",
          ).then((ok) => {
            if (ok) {
              setName("");
              setTarget("");
              setTargetDate("");
              setAccountId("");
            }
          })
        }
      >
        Add goal
      </Button>
    </div>
  );
}

function GoalItem({ workspaceId, goal }: { workspaceId: string; goal: GoalRow }) {
  const { busy, run, runResult } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(goal.targetRaw);

  return (
    <div className={`space-y-2 rounded-control p-3 ${goal.reached ? "bg-credit-tint/40" : "bg-raised/30"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold text-ink">{goal.name}</span>
          {goal.reached ? (
            <span className="text-xs font-semibold text-credit">Reached ✓</span>
          ) : (
            <span className="text-xs text-muted">{goal.insight}</span>
          )}
          {goal.linked && goal.accountName && (
            <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">Tracks {goal.accountName}</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="tabular text-muted">{goal.saved} / {goal.target}</span>
          {!goal.linked && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setContributing((v) => !v)}>
              Add to savings
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
              void run(() => deleteGoalAction(workspaceId, goal.id), "Goal removed");
            }}
          >
            {confirming ? "Remove?" : "Remove"}
          </Button>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-raised">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${goal.reached ? "bg-credit" : "bg-now"}`}
          style={{ width: `${Math.min(goal.pct, 100)}%` }}
        />
      </div>
      {contributing && !goal.linked && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void runResult(
              () => contributeGoalAction(workspaceId, goal.id, amount),
              (r) => (r.reached ? "Goal reached — nice ✓" : "Added to savings"),
            ).then((ok) => {
              if (ok) {
                setAmount("");
                setContributing(false);
              }
            });
          }}
        >
          <AmountInput aria-label={`Amount to add to ${goal.name}`} className="h-8 w-28 text-xs" placeholder="100.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button type="submit" size="sm" disabled={busy || amount.trim() === ""}>Add</Button>
        </form>
      )}
      {editing && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateGoalAction(workspaceId, goal.id, { targetAmount: target }), "Goal updated").then((ok) => ok && setEditing(false));
          }}
        >
          <Label htmlFor={`gt-${goal.id}`} className="text-xs">Target</Label>
          <AmountInput id={`gt-${goal.id}`} className="h-8 w-28 text-xs" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Button type="submit" size="sm" disabled={busy}>Save</Button>
        </form>
      )}
    </div>
  );
}

export function GoalsPanel({
  workspaceId,
  goals,
  accounts,
}: {
  workspaceId: string;
  goals: GoalRow[];
  accounts: AccountOption[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AddGoalForm workspaceId={workspaceId} accounts={accounts} />
        {goals.length === 0 ? (
          <p className="py-2 text-sm text-muted">
            No goals yet — set a savings target and, optionally, link the account that holds the money
            so progress tracks itself.
          </p>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => (
              <GoalItem key={g.id} workspaceId={workspaceId} goal={g} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
