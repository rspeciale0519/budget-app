"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/field";
import { createWorkspaceAction } from "@/app/(app)/_actions";
import { cn } from "@/lib/utils";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export function WorkspaceCreateDialog({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"personal" | "business">("personal");
  const [color, setColor] = useState(COLORS[0]!);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await createWorkspaceAction({ organizationId, name: name.trim(), type, color });
    setBusy(false);
    if (res.ok && res.workspaceId) {
      setOpen(false);
      setName("");
      router.push(`/w/${res.workspaceId}`);
      router.refresh();
    } else {
      setError(res.error ?? "Could not create the workspace — try again.");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Add workspace"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="whitespace-nowrap rounded-control px-2 py-2 text-[15px] font-semibold text-dim transition-colors hover:bg-raised hover:text-ink"
      >
        ＋
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-30 w-64 rounded-control border border-rule-strong bg-raised p-3 shadow-lg">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Name</Label>
              <Input
                id="ws-name"
                value={name}
                autoFocus
                placeholder="e.g. My Business"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-type">Type</Label>
              <Select
                id="ws-type"
                value={type}
                onChange={(e) => setType(e.target.value as "personal" | "business")}
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-5 w-5 rounded-full ring-offset-2",
                      color === c && "ring-2 ring-ink",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            {error && <FieldError>{error}</FieldError>}
            <Button type="submit" disabled={busy || name.trim() === ""} className="w-full">
              {busy ? "Creating…" : "Create workspace"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
