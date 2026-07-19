"use client";

import { useSyncExternalStore } from "react";

// The modifier label depends on the platform, which only exists on the client.
// Reading it as an external store (rather than setState-in-effect) keeps the
// server/client snapshots explicit and avoids a cascading render.
function subscribe() {
  return () => {};
}
function getSnapshot(): string {
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl ";
}
function getServerSnapshot(): string {
  return "⌘";
}

/** Visible entry point for the ⌘K / Ctrl-K command palette (which listens for this event). */
export function SearchButton() {
  const mod = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="hidden h-9 items-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-semibold text-ink/85 transition-colors hover:border-dim hover:bg-raised lg:flex"
    >
      Jump to…
      <kbd className="rounded border border-rule px-1 py-0.5 font-mono text-[10px] text-dim">
        {mod}K
      </kbd>
    </button>
  );
}
