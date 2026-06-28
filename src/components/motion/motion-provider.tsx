"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Global framer-motion config. `reducedMotion="user"` makes every motion
 * component automatically drop transforms/animation when the user has
 * `prefers-reduced-motion: reduce` set, without per-component checks.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
