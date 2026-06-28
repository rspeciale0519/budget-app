"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabWorkspace {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

export function WorkspaceTabs({ workspaces }: { workspaces: TabWorkspace[] }) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/w/") ? pathname.split("/")[2] : null;
  const allActive = pathname.startsWith("/all");

  return (
    <div className="flex flex-1 items-center gap-1 overflow-auto">
      {workspaces.map((w) => {
        const active = w.id === activeId;
        return (
          <Link
            key={w.id}
            href={`/w/${w.id}`}
            className={cn(
              "relative flex items-center gap-[7px] whitespace-nowrap rounded-lg px-3 py-[7px] text-[13px] font-semibold transition-colors",
              active ? "text-ink" : "text-muted hover:bg-bg-elev hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="workspace-tab-active"
                className="absolute inset-0 rounded-lg bg-bg-elev"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className="relative h-[9px] w-[9px] rounded-full"
              style={{ backgroundColor: w.color }}
            />
            {w.icon ? (
              <span className="relative" aria-hidden>
                {w.icon}
              </span>
            ) : null}
            <span className="relative">{w.name}</span>
            {active && (
              <motion.span
                layoutId="workspace-tab-underline"
                className="absolute inset-x-2 -bottom-[9px] h-[2px] rounded-full bg-pos"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
      <button
        type="button"
        className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg text-muted/70 transition-colors hover:bg-bg-elev hover:text-ink"
        title="Add workspace (coming soon)"
        aria-label="Add workspace"
      >
        <Plus className="h-4 w-4" />
      </button>
      <Link
        href="/all"
        className={cn(
          "ml-1 flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-[7px] text-[13px] font-semibold transition-colors",
          allActive ? "bg-bg-elev text-ink" : "text-muted hover:bg-bg-elev hover:text-ink",
        )}
      >
        <LayoutList className="h-3.5 w-3.5" /> All Workspaces
      </Link>
    </div>
  );
}
