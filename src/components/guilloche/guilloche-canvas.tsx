"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { parseHex, startGuilloche, type GuillochePalette } from "./renderer";

const FALLBACK: GuillochePalette = {
  paper: [0.027, 0.039, 0.067],
  lineA: [0.49, 0.635, 1],
  lineB: [0.369, 0.918, 0.831],
};

function readVar(styles: CSSStyleDeclaration, name: string): [number, number, number] | null {
  return parseHex(styles.getPropertyValue(name));
}

/** Cut the plate in the live theme's colors so it follows dark/light. */
function readPalette(): GuillochePalette {
  const styles = getComputedStyle(document.documentElement);
  return {
    paper: readVar(styles, "--paper") ?? FALLBACK.paper,
    lineA: readVar(styles, "--now") ?? FALLBACK.lineA,
    lineB: readVar(styles, "--credit") ?? FALLBACK.lineB,
  };
}

/**
 * A live engraved guilloché — the rosette line-work on every banknote and share
 * certificate. Decorative, so it is `aria-hidden`, and it stays transparent
 * unless the GPU confirms it can draw: a sign-in page must never depend on
 * WebGL, and a failed context should reveal the static field beneath rather
 * than a black rectangle.
 */
export function GuillocheCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const handle = startGuilloche(canvas, {
      palette: readPalette(),
      // Seeded per visit: the plate is never cut quite the same way twice.
      seed: Math.random() * 10,
      still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    if (!handle) return;

    setReady(true);
    return () => handle.destroy();
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn(
        "transition-opacity duration-[1200ms] ease-[var(--ease-instrument)]",
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
