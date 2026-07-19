"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface LayoutOption {
  id: string;
  name: string;
}

/** Quick-jump to a saved tile layout from anywhere, not just the /tiles page. */
export function LayoutsDropdown({ layouts }: { layouts: LayoutOption[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (layouts.length === 0) return null;

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-semibold text-ink/85 transition-colors hover:border-dim hover:bg-raised"
        title="Jump to a saved view"
      >
        Saved views ⌄
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Saved layouts"
          className="absolute right-0 top-10 z-30 w-52 rounded-control border border-rule-strong bg-raised p-1.5 shadow-lg"
        >
          {layouts.map((l) => (
            <Link
              key={l.id}
              role="menuitem"
              href={`/tiles?layout=${l.id}`}
              onClick={() => setOpen(false)}
              className="block truncate rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-surface"
            >
              {l.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
