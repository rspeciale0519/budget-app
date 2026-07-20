"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { applyTheme } from "@/lib/theme";
import { buildCommands, filterCommands, type Command } from "@/lib/command-palette/commands";
import { searchTransactionsAction, type TransactionHit } from "@/app/(app)/search-actions";

type Workspace = { id: string; name: string; color: string };

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
            ⌕
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
                            "grid h-6 w-6 place-items-center rounded-md text-[13px] transition-colors",
                            active ? "bg-now-tint text-now" : "bg-raised text-muted",
                          )}
                          aria-hidden
                        >
                          {cmd.icon}
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
                          "grid h-6 w-6 place-items-center rounded-md text-[13px] transition-colors",
                          active ? "bg-now-tint text-now" : "bg-raised text-muted",
                        )}
                        aria-hidden
                      >
                        ⌕
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
