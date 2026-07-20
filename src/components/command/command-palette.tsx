"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { applyTheme } from "@/lib/theme";
import { buildCommands, filterCommands, type Command } from "@/lib/command-palette/commands";
import { searchTransactionsAction, type TransactionHit } from "@/app/(app)/search-actions";

type Workspace = { id: string; name: string; color: string };

/*
  One icon language for the whole palette: 14px strokes in the current text
  color. Book commands are the exception on purpose — they get the same colored
  dot their pills wear in the top bar, so "Go to Personal" matches "Personal".
*/
const STROKE = {
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
  stroke: "currentColor",
} as const;

function PaletteIcon({ name, color }: { name: string; color?: string }) {
  if (name === "book") {
    return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
  }
  const paths: Record<string, React.ReactNode> = {
    plus: <path d="M7 2.5v9M2.5 7h9" />,
    bill: <path d="M3.5 1.5h7v11l-1.75-1-1.75 1-1.75-1-1.75 1zM5.5 5h3M5.5 7.5h3" />,
    draw: <path d="M2.5 11.5l9-9m0 0h-5.5m5.5 0v5.5" />,
    import: <path d="M7 1.5v7m0 0L4 5.7M7 8.5l3-2.8M2 10v1.5a1 1 0 001 1h8a1 1 0 001-1V10" />,
    grid: <path d="M2 2h4v4H2zM8 2h4v4H8zM2 8h4v4H2zM8 8h4v4H8z" />,
    tiles: <path d="M2 2.5h4.25v9H2zM7.75 2.5H12v9H7.75z" />,
    theme: (
      <>
        <circle cx="7" cy="7" r="5.25" />
        <path d="M7 1.75a5.25 5.25 0 010 10.5z" fill="currentColor" stroke="none" />
      </>
    ),
    settings: <path d="M2 4h6.5M11 4h1M9 4a1.4 1.4 0 103 0 1.4 1.4 0 00-3 0zM12 10H5.5M3 10H2M5 10a1.4 1.4 0 10-3 0 1.4 1.4 0 003 0z" />,
    members: <path d="M5.25 6.5a2 2 0 100-4 2 2 0 000 4zM1.75 11.5a3.5 3.5 0 017 0M9.5 6.3a1.9 1.9 0 10-.9-3.6M12.25 11.5a3.3 3.3 0 00-2.6-3.2" />,
    search: <path d="M6.25 10.5a4.25 4.25 0 100-8.5 4.25 4.25 0 000 8.5zM9.4 9.4l3.1 3.1" />,
  };
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" {...STROKE} aria-hidden>
      {paths[name] ?? paths.search}
    </svg>
  );
}

export function CommandPalette({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const currentWorkspaceId = useMemo(() => {
    const m = /^\/w\/([^/]+)/.exec(pathname ?? "");
    return m ? m[1]! : null;
  }, [pathname]);

  const filtered = useMemo(
    () => filterCommands(buildCommands({ workspaces, currentWorkspaceId }), query),
    [workspaces, currentWorkspaceId, query],
  );

  // Data search: debounced transaction lookup across the user's books. All
  // setState happens inside the timeout/async callbacks (never the effect body),
  // and results are tagged with their query so stale responses gate themselves
  // out at render instead of needing a synchronous clear.
  const [search, setSearch] = useState<{ q: string; hits: TransactionHit[]; pending: boolean }>({
    q: "",
    hits: [],
    pending: false,
  });
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 3) return;
    let stale = false;
    const t = setTimeout(() => {
      if (stale) return;
      setSearch((cur) => (cur.q === q ? cur : { q, hits: [], pending: true }));
      void searchTransactionsAction(q).then((rows) => {
        if (stale) return;
        setSearch({ q, hits: rows, pending: false });
      });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, open]);

  // Only show hits that belong to the CURRENT query (stale results self-gate).
  const q = query.trim();
  const hits = q.length >= 3 && search.q === q ? search.hits : [];
  const searching = q.length >= 3 && (search.q !== q || search.pending);

  // One combined selectable list: commands first, then transaction hits.
  const totalItems = filtered.length + hits.length;

  useEffect(() => {
    function toggle() {
      setQuery("");
      setSelected(0);
      setOpen((o) => !o);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", toggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", toggle);
    };
  }, []);

  // Focus the input on open; put focus back where it was on close.
  useEffect(() => {
    if (open) {
      lastFocused.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
    } else {
      lastFocused.current?.focus?.();
    }
  }, [open]);

  if (!open) return null;

  function go(cmd: Command | undefined) {
    if (!cmd) return;
    setOpen(false);
    if (cmd.action === "toggle-theme") {
      const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      applyTheme(cur === "light" ? "dark" : "light");
      return;
    }
    if (cmd.action === "new-book") {
      window.dispatchEvent(new Event("open-create-book"));
      return;
    }
    if (cmd.href) router.push(cmd.href);
  }

  function goToHit(hit: TransactionHit | undefined) {
    if (!hit) return;
    setOpen(false);
    // Land on that book's register with the query prefilled — the row will be in it.
    router.push(`/w/${hit.workspaceId}/transactions?q=${encodeURIComponent(query.trim())}`);
  }

  function activate(index: number) {
    if (index < filtered.length) go(filtered[index]);
    else goToHit(hits[index - filtered.length]);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(selected);
    }
  }

  const groups: Command["group"][] = ["Quick actions", "Go to book", "View", "Settings"];

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>("input, button, [tabindex]");
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-sunken/70 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={trapTab}
        className="w-full max-w-[560px] overflow-hidden rounded-card border border-rule-strong bg-surface shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-rule px-4 py-3.5 text-[15px] text-ink">
          <span aria-hidden className="text-dim">
            <PaletteIcon name="search" />
          </span>
          <input
            ref={inputRef}
            aria-label="Command palette"
            className="w-full bg-transparent outline-none placeholder:text-dim"
            placeholder="Search transactions, or type a command…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onInputKey}
          />
          <kbd className="rounded border border-rule px-1.5 py-0.5 font-mono text-[10px] text-dim">
            esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-auto py-1.5">
          {filtered.length === 0 && hits.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">
              {searching
                ? "Searching…"
                : "Nothing matched. Try a merchant name, a book name, or “import”, “bill”, “settings”."}
            </p>
          ) : (
            <>
            {groups.map((group) => {
              const items = filtered.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="px-1.5">
                  <div className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-dim">
                    {group}
                  </div>
                  {items.map((cmd) => {
                    const idx = filtered.indexOf(cmd);
                    const active = idx === selected;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onMouseEnter={() => setSelected(idx)}
                        onClick={() => go(cmd)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors",
                          active ? "bg-raised text-ink" : "text-ink/85",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-md transition-colors",
                            active ? "bg-now-tint text-now" : "bg-raised text-muted",
                          )}
                          aria-hidden
                        >
                          <PaletteIcon name={cmd.icon} color={cmd.color} />
                        </span>
                        {cmd.label}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {hits.length > 0 && (
              <div className="px-1.5">
                <div className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-dim">
                  Transactions
                </div>
                {hits.map((hit, i) => {
                  const idx = filtered.length + i;
                  const active = idx === selected;
                  return (
                    <button
                      key={`${hit.workspaceId}-${i}`}
                      type="button"
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => goToHit(hit)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors",
                        active ? "bg-raised text-ink" : "text-ink/85",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-md transition-colors",
                          active ? "bg-now-tint text-now" : "bg-raised text-muted",
                        )}
                        aria-hidden
                      >
                        <PaletteIcon name="search" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{hit.description}</span>
                      <span className="tabular shrink-0 text-xs text-muted">{hit.amount}</span>
                      <span className="shrink-0 text-[11px] text-dim">{hit.workspaceName}</span>
                    </button>
                  );
                })}
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
