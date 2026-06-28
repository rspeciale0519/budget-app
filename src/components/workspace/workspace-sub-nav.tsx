"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Settings2,
  CalendarDays,
  PiggyBank,
  Wallet,
  Upload,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: [string, string, LucideIcon][] = [
  ["Dashboard", "", LayoutDashboard],
  ["Manage", "/manage", Settings2],
  ["Calendar", "/calendar", CalendarDays],
  ["Budget", "/budget", PiggyBank],
  ["Income", "/income", Wallet],
  ["Import", "/import", Upload],
  ["Audit", "/audit", ScrollText],
];

export function WorkspaceSubNav({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const base = `/w/${workspaceId}`;

  return (
    <nav className="mb-4 flex flex-wrap gap-1 text-[13px]">
      {ITEMS.map(([label, sub, Icon]) => {
        const href = `${base}${sub}`;
        const active = sub === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
              active ? "text-ink" : "text-muted hover:bg-bg-elev hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="subnav-active"
                className="absolute inset-0 rounded-md bg-bg-elev"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="relative h-3.5 w-3.5" />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
