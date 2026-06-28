"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EmptyMascot } from "@/components/three/empty-mascot";
import { springSoft } from "@/lib/motion/presets";

export function EmptyState({
  title,
  description,
  action,
  showMascot = true,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  showMascot?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-card p-10 text-center"
    >
      {showMascot && <EmptyMascot size={110} className="mb-4" />}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </motion.div>
  );
}
