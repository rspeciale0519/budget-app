"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

const HeroScene = dynamic(() => import("@/components/three/hero-scene"), {
  ssr: false,
  loading: () => <HeroFallback />,
});

/** Static, calm gradient fallback for reduced motion / loading. */
function HeroFallback() {
  return (
    <div
      className="h-full w-full"
      style={{
        background:
          "radial-gradient(80% 80% at 30% 20%, color-mix(in oklab, var(--primary) 35%, transparent), transparent), radial-gradient(70% 70% at 80% 70%, color-mix(in oklab, var(--teal) 30%, transparent), transparent)",
      }}
      aria-hidden
    />
  );
}

/** Ambient 3D hero used behind the login form. Decorative only. */
export function LoginHero({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={cn("absolute inset-0 -z-10", className)} aria-hidden>
      {reduced ? <HeroFallback /> : <HeroScene />}
    </div>
  );
}
