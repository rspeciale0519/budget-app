"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <div className="flex flex-1 items-center gap-1 overflow-x-auto">
      {workspaces.map((w) => {
        const active = w.id === activeId;
        return (
          <Link
            key={w.id}
            href={`/w/${w.id}`}
            className={cn(
              "group relative flex items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 text-[13px] font-semibold transition-colors",
              active ? "bg-raised text-ink" : "text-muted hover:bg-raised/60 hover:text-ink",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-transform",
                !active && "opacity-60 group-hover:opacity-100",
              )}
              style={{ backgroundColor: w.color }}
            />
            {w.icon ? <span aria-hidden>{w.icon}</span> : null}
            {w.name}
            {/* The active tab is underscored in its own workspace color. */}
            {active ? (
              <span
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                style={{ backgroundColor: w.color }}
              />
            ) : null}
          </Link>
        );
      })}

      <span
        className="cursor-default whitespace-nowrap rounded-control px-2 py-2 text-[15px] font-semibold text-dim"
        title="Add workspace (coming soon)"
      >
        ＋
      </span>

      <Link
        href="/all"
        className={cn(
          "ml-1 whitespace-nowrap rounded-control px-3 py-2 text-[13px] font-semibold transition-colors",
          allActive ? "bg-raised text-ink" : "text-muted hover:bg-raised/60 hover:text-ink",
        )}
      >
        ▦ All Workspaces
      </Link>
    </div>
  );
}
