"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildCommands, filterCommands, type Command } from "@/lib/command-palette/commands";

type Workspace = { id: string; name: string; color: string };

export function CommandPalette({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWorkspaceId = useMemo(() => {
    const m = /^\/w\/([^/]+)/.exec(pathname ?? "");
    return m ? m[1]! : null;
  }, [pathname]);

  const filtered = useMemo(
    () => filterCommands(buildCommands({ workspaces, currentWorkspaceId }), query),
    [workspaces, currentWorkspaceId, query],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setSelected(0);
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // DOM-only side effect (no setState) — focus the input once the palette opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function go(cmd: Command | undefined) {
    if (!cmd) return;
    setOpen(false);
    router.push(cmd.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(filtered[selected]);
    }
  }

  const groups: Command["group"][] = ["Quick actions", "Go to workspace"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-sunken/70 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-card border border-rule-strong bg-surface shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-rule px-4 py-3.5 text-[15px] text-ink">
          <span aria-hidden className="text-dim">
            ⌘
          </span>
          <input
            ref={inputRef}
            aria-label="Command palette"
            className="w-full bg-transparent outline-none placeholder:text-dim"
            placeholder="Type a command or search…"
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
          {filtered.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">No matching commands</p>
          ) : (
            groups.map((group) => {
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
