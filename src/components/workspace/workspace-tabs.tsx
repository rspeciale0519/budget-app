"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WorkspaceCreateDialog } from "@/components/workspace/workspace-create-dialog";
import { GridGlyph } from "@/components/ui/glyphs";

export interface TabWorkspace {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  type: "personal" | "business";
}

export function WorkspaceTabs({
  workspaces,
  organizationId,
}: {
  workspaces: TabWorkspace[];
  organizationId: string | null;
}) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/w/") ? pathname.split("/")[2] : null;
  const allActive = pathname.startsWith("/all");

  // Personal workspaces before business ones; a thin divider marks the
  // handoff, but only when both groups actually exist.
  const sorted = [...workspaces].sort((a, b) =>
    a.type === b.type ? 0 : a.type === "personal" ? -1 : 1,
  );

  return (
    <div className="flex flex-1 items-center gap-1 overflow-x-auto">
      {sorted.map((w, i) => {
        const active = w.id === activeId;
        const startsBusinessGroup =
          i > 0 && w.type === "business" && sorted[i - 1]!.type === "personal";
        return (
          <span key={w.id} className="flex items-center gap-1">
            {startsBusinessGroup && <span aria-hidden className="mx-1 h-5 w-px bg-rule" />}
            <Link
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
          </span>
        );
      })}

      {organizationId && <WorkspaceCreateDialog organizationId={organizationId} />}

      <Link
        href="/all"
        className={cn(
          "ml-1 flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-2 text-[13px] font-semibold transition-colors",
          allActive ? "bg-raised text-ink" : "text-muted hover:bg-raised/60 hover:text-ink",
        )}
      >
        <GridGlyph /> All books
      </Link>
    </div>
  );
}
