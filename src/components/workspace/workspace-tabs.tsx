"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <div className="flex flex-1 items-center gap-1.5 overflow-auto">
      {workspaces.map((w) => {
        const active = w.id === activeId;
        return (
          <Link
            key={w.id}
            href={`/w/${w.id}`}
            className={`flex items-center gap-[7px] whitespace-nowrap rounded-[9px] border px-3 py-[7px] text-[13px] font-semibold ${
              active
                ? "border-line bg-[#f3f5f8] text-ink shadow-[inset_0_-2px_0_var(--color-pos)]"
                : "border-transparent text-muted hover:bg-[#f6f7f9]"
            }`}
          >
            <span className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: w.color }} />
            {w.icon ? <span aria-hidden>{w.icon}</span> : null}
            {w.name}
          </Link>
        );
      })}
      <span
        className="cursor-default whitespace-nowrap rounded-[9px] px-2.5 py-[7px] text-[13px] font-bold text-[#9aa1ad]"
        title="Add workspace (coming soon)"
      >
        ＋
      </span>
      <Link
        href="/all"
        className={`ml-1 whitespace-nowrap rounded-[9px] border px-3 py-[7px] text-[13px] font-semibold ${
          allActive ? "border-line bg-[#f3f5f8] text-ink" : "border-transparent text-[#374151] hover:bg-[#f6f7f9]"
        }`}
      >
        ▦ All Workspaces
      </Link>
    </div>
  );
}
