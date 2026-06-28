"use client";

import dynamic from "next/dynamic";
import { PiggyBank } from "lucide-react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

const MascotScene = dynamic(() => import("./mascot-scene"), { ssr: false });

interface EmptyMascotProps {
  /** Pixel size of the square canvas/fallback. */
  size?: number;
  className?: string;
}

/**
 * Friendly 3D coin-jar mascot for empty states.
 * Lazy-loads the R3F scene and falls back to a static icon when the user
 * prefers reduced motion or while the scene is loading.
 */
export function EmptyMascot({ size = 120, className }: EmptyMascotProps) {
  const reduced = useReducedMotion();

  const fallback = (
    <div
      className="flex items-center justify-center rounded-full bg-primary-soft text-primary"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <PiggyBank size={Math.round(size * 0.45)} strokeWidth={1.5} />
    </div>
  );

  if (reduced) return <div className={className}>{fallback}</div>;

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden="true">
      <MascotScene />
    </div>
  );
}
