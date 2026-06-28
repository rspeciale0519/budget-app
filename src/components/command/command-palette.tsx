"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { buildCommands, filterCommands, type Command } from "@/lib/command-palette/commands";
import { cn } from "@/lib/utils";

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
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="w-full max-w-[540px] overflow-hidden rounded-xl border border-line bg-card shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5 text-[15px] text-ink">
              <Search className="h-[18px] w-[18px] text-muted" />
              <input
                ref={inputRef}
                aria-label="Command palette"
                className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
                placeholder="Type a command or search…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                onKeyDown={onInputKey}
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                ESC
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">No matching commands</p>
              ) : (
                groups.map((group) => {
                  const items = filtered.filter((c) => c.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="px-4 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted">
                        {group}
                      </div>
                      {items.map((cmd) => {
                        const idx = filtered.indexOf(cmd);
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            onMouseEnter={() => setSelected(idx)}
                            onClick={() => go(cmd)}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13.5px] font-semibold text-ink transition-colors",
                              idx === selected ? "bg-bg-elev" : "",
                            )}
                          >
                            <span
                              className="grid h-6 w-6 place-items-center rounded-[7px] bg-bg-elev text-[13px]"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
