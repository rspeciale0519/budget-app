"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/** Interactive right-side cluster of the global top bar. */
export function TabBarActions({ initial }: { initial: string }) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <Link
        href="/tiles"
        className="flex items-center justify-center rounded-lg border border-line bg-card px-2.5 py-[7px] text-muted transition-colors hover:bg-bg-elev hover:text-ink lg:hidden"
        title="Tile view"
        aria-label="Tile view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Link>
      <Link
        href="/tiles"
        className="hidden items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-[7px] text-xs font-semibold text-muted transition-colors hover:bg-bg-elev hover:text-ink lg:flex"
        title="Tile multiple workspaces side-by-side"
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Tile view
      </Link>
      <Link
        href="/tiles"
        className="hidden items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-[7px] text-xs font-semibold text-muted transition-colors hover:bg-bg-elev hover:text-ink lg:flex"
        title="Saved layouts"
      >
        Layouts <ChevronDown className="h-3.5 w-3.5" />
      </Link>
      <ThemeToggle />
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="grid h-[30px] w-[30px] place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary"
      >
        {initial}
      </motion.div>
    </div>
  );
}
