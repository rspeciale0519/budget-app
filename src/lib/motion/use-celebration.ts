"use client";

import { useCallback } from "react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * Returns a `celebrate()` function that fires a confetti burst.
 * No-ops when the user prefers reduced motion. canvas-confetti is loaded
 * lazily so it never ships in the initial bundle.
 */
export function useCelebration() {
  const reduced = useReducedMotion();

  return useCallback(
    async (options?: { intense?: boolean }) => {
      if (reduced || typeof window === "undefined") return;
      const confetti = (await import("canvas-confetti")).default;

      const colors = ["#4f46e5", "#16a34a", "#d97706", "#2563eb", "#0d9488"];
      const count = options?.intense ? 180 : 110;

      const fire = (particleRatio: number, opts: Record<string, unknown>) => {
        confetti({
          origin: { y: 0.7 },
          colors,
          disableForReducedMotion: true,
          particleCount: Math.floor(count * particleRatio),
          ...opts,
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    },
    [reduced],
  );
}
