"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS: [string, string][] = [
  ["Dashboard", ""],
  ["Transactions", "/transactions"],
  ["Manage", "/manage"],
  ["Calendar", "/calendar"],
  ["Budget", "/budget"],
  ["Income", "/income"],
  ["Import", "/import"],
  ["Activity", "/audit"],
];

export function WorkspaceSubNav({
  workspaceId,
  showActivity = true,
}: {
  workspaceId: string;
  showActivity?: boolean;
}) {
  const pathname = usePathname();
  const base = `/w/${workspaceId}`;
  const items = showActivity ? ITEMS : ITEMS.filter(([, sub]) => sub !== "/audit");

  return (
    <nav className="mb-5 flex flex-wrap items-center gap-0.5 border-b border-rule text-[13px]">
      {items.map(([label, sub]) => {
        const href = `${base}${sub}`;
        // Dashboard ("") is active only on an exact match; the rest own their subtree.
        const active = sub === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px border-b-2 px-3 py-2 font-semibold transition-colors",
              active
                ? "border-now text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
