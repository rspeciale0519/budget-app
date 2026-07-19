"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/field";
import { createWorkspaceAction } from "@/app/(app)/_actions";
import { cn } from "@/lib/utils";

const COLORS: { hex: string; name: string }[] = [
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#10b981", name: "Green" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#8b5cf6", name: "Violet" },
  { hex: "#14b8a6", name: "Teal" },
];

export function WorkspaceCreateDialog({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"personal" | "business">("personal");
  const [color, setColor] = useState(COLORS[0]!.hex);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The ⌘K palette's "New book" command opens this dialog via a window event.
  useEffect(() => {
    function openIt() {
      setOpen(true);
    }
    window.addEventListener("open-create-book", openIt);
    return () => window.removeEventListener("open-create-book", openIt);
  }, []);

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
      setError(res.error ?? "Could not create the book — try again.");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Add book"
        title="New book"
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
              <p className="text-[11px] text-muted">
                Business books add owner-pay tools — paying yourself is tracked correctly, not
                counted as income twice.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    onClick={() => setColor(c.hex)}
                    className={cn(
                      "h-5 w-5 rounded-full ring-offset-2",
                      color === c.hex && "ring-2 ring-ink",
                    )}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
            {error && <FieldError>{error}</FieldError>}
            <Button type="submit" disabled={busy || name.trim() === ""} className="w-full">
              {busy ? "Creating…" : "Create book"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
