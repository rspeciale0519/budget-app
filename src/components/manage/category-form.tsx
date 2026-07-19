"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, FieldError } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  addCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
} from "@/app/(app)/w/[workspaceId]/_actions";

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

        <div className="space-y-3 text-sm">
          <CategoryGroup workspaceId={workspaceId} label="Spending" items={expense} />
          <CategoryGroup workspaceId={workspaceId} label="Income" items={income} />
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryGroup({
  workspaceId,
  label,
  items,
}: {
  workspaceId: string;
  label: string;
  items: CategoryView[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
      {items.map((c) => (
        <CategoryChip key={c.id} workspaceId={workspaceId} category={c} />
      ))}
    </div>
  );
}

function CategoryChip({
  workspaceId,
  category,
}: {
  workspaceId: string;
  category: CategoryView;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function rename() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === category.name) {
      setEditing(false);
      setName(category.name);
      return;
    }
    setBusy(true);
    const res = await renameCategoryAction(workspaceId, category.id, trimmed);
    setBusy(false);
    setEditing(false);
    if (res.ok) {
      toast("Category renamed");
      router.refresh();
    } else {
      toast(res.error ?? "Could not rename that category.", { kind: "error" });
      setName(category.name);
    }
  }

  async function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setConfirmingDelete(false);
    setBusy(true);
    const res = await deleteCategoryAction(workspaceId, category.id);
    setBusy(false);
    if (res.ok) {
      toast("Category deleted");
      router.refresh();
    } else {
      toast(res.error ?? "Could not delete that category.", { kind: "error" });
    }
  }

  if (editing) {
    return (
      <form
        className="inline-flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          void rename();
        }}
      >
        <Input
          aria-label={`Rename ${category.name}`}
          className="h-7 w-28 text-xs"
          value={name}
          autoFocus
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setName(category.name);
            }
          }}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
        />
      </form>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface py-0.5 pl-2.5 pr-1 text-xs text-ink/85">
      <button
        type="button"
        className="hover:underline"
        title="Click to rename"
        onClick={() => setEditing(true)}
      >
        {category.name}
      </button>
      <button
        type="button"
        className={confirmingDelete ? "font-semibold text-alert" : "text-dim hover:text-alert"}
        title={confirmingDelete ? "Click again to confirm delete" : "Delete category"}
        disabled={busy}
        onClick={remove}
        onBlur={() => setConfirmingDelete(false)}
      >
        {confirmingDelete ? "confirm ✕" : "✕"}
      </button>
    </span>
  );
}
