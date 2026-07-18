"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";

export function AvatarMenu({ initial, email }: { initial: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  async function signOut() {
    setSigningOut(true);
    await createBrowserClient().auth.signOut();
    window.location.assign("/login");
  }

  const itemCls =
    "block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-raised";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full bg-now-tint text-xs font-bold text-now ring-1 ring-inset ring-now/25"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-10 z-30 w-56 rounded-control border border-rule-strong bg-raised p-1.5 shadow-lg"
        >
          <div className="truncate px-2.5 py-1.5 text-xs text-muted" title={email}>
            {email}
          </div>
          <Link role="menuitem" href="/settings" className={itemCls} onClick={() => setOpen(false)}>
            Settings
          </Link>
          <Link
            role="menuitem"
            href="/settings/members"
            className={itemCls}
            onClick={() => setOpen(false)}
          >
            Sharing &amp; members
          </Link>
          <div className="my-1 h-px bg-rule" />
          <button role="menuitem" type="button" onClick={signOut} disabled={signingOut} className={itemCls}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
