"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  deleteRuleAction,
  updateRuleAction,
} from "@/app/(app)/w/[workspaceId]/transactions/_actions";

export interface RuleView {
  id: string;
  pattern: string;
  categoryName: string;
}

function RuleRow({ workspaceId, rule }: { workspaceId: string; rule: RuleView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pattern, setPattern] = useState(rule.pattern);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    setBusy(true);
    const res = await updateRuleAction(workspaceId, rule.id, { pattern: pattern.trim() });
    setBusy(false);
    setEditing(false);
    if (res.ok) {
      toast("Rule updated");
      router.refresh();
    } else {
      toast(res.error ?? "Could not update the rule.", { kind: "error" });
    }
  }

  async function remove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setBusy(true);
    const res = await deleteRuleAction(workspaceId, rule.id);
    setBusy(false);
    if (res.ok) {
      toast("Rule removed");
      router.refresh();
    } else {
      toast(res.error ?? "Could not remove the rule.", { kind: "error" });
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule py-2 text-sm last:border-b-0">
      {editing ? (
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Input
            aria-label="Rule pattern"
            className="h-8 flex-1 text-xs"
            value={pattern}
            autoFocus
            onChange={(e) => setPattern(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          />
          <Button type="submit" size="sm" disabled={busy || pattern.trim() === ""}>
            Save
          </Button>
        </form>
      ) : (
        <span className="text-ink/85">
          Anything containing{" "}
          <b className="font-mono font-semibold text-ink">“{rule.pattern}”</b> →{" "}
          <span className="font-semibold text-ink">{rule.categoryName}</span>
        </span>
      )}
      {!editing && (
        <span className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant={confirming ? "danger" : "ghost"}
            size="sm"
            disabled={busy}
            onBlur={() => setConfirming(false)}
            onClick={remove}
          >
            {confirming ? "Remove?" : "✕"}
          </Button>
        </span>
      )}
    </div>
  );
}

export function RulesCard({ workspaceId, rules }: { workspaceId: string; rules: RuleView[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-categorize rules</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {rules.length === 0 ? (
          <p className="py-2 text-muted">
            No rules yet. Set one from any transaction with the <b className="text-ink">Always</b>{" "}
            button — Ledger will categorize matching transactions automatically.
          </p>
        ) : (
          rules.map((r) => <RuleRow key={r.id} workspaceId={workspaceId} rule={r} />)
        )}
      </CardContent>
    </Card>
  );
}
