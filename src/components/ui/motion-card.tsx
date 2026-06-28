"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { staggerItem } from "@/lib/motion/presets";

/**
 * Card with entrance animation + hover lift. Intended to be used inside a
 * framer-motion stagger container (variants="show"). Honors reduced-motion
 * automatically because the parent container controls when animation runs,
 * and framer-motion respects the OS setting via MotionConfig where applied.
 */
export function MotionCard({
  className,
  children,
  interactive = true,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={interactive ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className={cn(
        "rounded-card border border-line bg-card shadow-card",
        interactive && "hover:shadow-pop",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
