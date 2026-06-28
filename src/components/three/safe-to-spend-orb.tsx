"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

// Code-split: the R3F/three bundle only loads when the orb is rendered.
const OrbScene = dynamic(() => import("@/components/three/orb-scene"), {
  ssr: false,
  loading: () => <OrbFallback health={0.5} pulse />,
});

/** Static CSS fallback used for reduced-motion users and while loading. */
function OrbFallback({ health, pulse }: { health: number; pulse?: boolean }) {
  const hue = Math.round(health * 140);
  return (
    <div
      className={cn(
        "h-full w-full rounded-full",
        pulse && "skeleton",
      )}
      style={{
        background: pulse
          ? undefined
          : `radial-gradient(circle at 35% 30%, hsl(${hue},75%,65%), hsl(${hue},70%,42%))`,
        boxShadow: pulse ? undefined : `0 8px 40px hsla(${hue},70%,45%,0.45)`,
      }}
      aria-hidden
    />
  );
}

/**
 * Safe-to-spend orb. Renders an interactive 3D orb whose color reflects
 * budget health; falls back to a static gradient sphere for reduced motion.
 * @param health 0 (over budget) .. 1 (healthy)
 */
export function SafeToSpendOrb({
  health,
  className,
}: {
  health: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, health));

  return (
    <div className={cn("relative", className)}>
      {reduced ? <OrbFallback health={clamped} /> : <OrbScene health={clamped} />}
    </div>
  );
}
