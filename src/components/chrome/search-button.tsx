"use client";

/** Visible entry point for the ⌘K command palette (which listens for this event). */
export function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="hidden h-9 items-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-semibold text-ink/85 transition-colors hover:border-dim hover:bg-raised lg:flex"
    >
      Search
      <kbd className="rounded border border-rule px-1 py-0.5 font-mono text-[10px] text-dim">⌘K</kbd>
    </button>
  );
}
