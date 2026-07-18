"use client";

import { useEffect, useRef } from "react";
import { startAllocationScene } from "./allocation-scene";

/**
 * The sign-in backdrop — a budget funding itself in the app's own colors. The
 * canvas carries the animation; the veil clears a soft pocket behind the card so
 * the form stays perfectly legible over whatever is moving. Both are decorative,
 * so both are `aria-hidden`, and if the canvas can't start the veil alone leaves
 * a calm, valid page.
 */
export function LoginBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const handle = startAllocationScene(canvas);
    return () => handle?.destroy();
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46% 48% at 50% 46%, color-mix(in oklab, var(--paper) 82%, transparent), transparent 74%)",
        }}
      />
    </>
  );
}
