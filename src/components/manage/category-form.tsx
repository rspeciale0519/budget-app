"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, FieldError } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { addCategoryAction } from "@/app/(app)/w/[workspaceId]/_actions";

export interface CategoryView {
  id: string;
  name: string;
  kind: string;
}

export function CategoryManager({
  workspaceId,
  categories,
}: {
  workspaceId: string;
  categories: CategoryView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("expense");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const expense = categories.filter((c) => c.kind === "expense");
  const income = categories.filter((c) => c.kind === "income");

  async function add() {
    setBusy(true);
    setError(null);
    const res = await addCategoryAction(workspaceId, { name: name.trim(), kind });
    setBusy(false);
    if (res.ok) {
      setName("");
      toast("Category added");
      router.refresh();
    } else {
      setError(res.error ?? "Could not add that category — try again.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label htmlFor="cat-name">New category</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Coffee"
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-kind">Type</Label>
            <Select
              id="cat-kind"
              className="w-auto"
              value={kind}
              disabled={busy}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="expense">Spending</option>
              <option value="income">Income</option>
            </Select>
          </div>
          <Button type="submit" disabled={busy || name.trim() === ""}>
            {busy ? "Adding…" : "Add category"}
          </Button>
        </form>
        {error && <FieldError>{error}</FieldError>}

        <div className="space-y-2 text-sm">
          <CategoryGroup label="Spending" items={expense} />
          <CategoryGroup label="Income" items={income} />
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryGroup({ label, items }: { label: string; items: CategoryView[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
      {items.map((c) => (
        <span key={c.id} className="rounded-full border border-rule bg-surface px-2.5 py-0.5 text-xs text-ink/85">
          {c.name}
        </span>
      ))}
    </div>
  );
}
