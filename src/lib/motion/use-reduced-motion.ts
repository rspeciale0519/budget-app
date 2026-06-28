"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the user has requested reduced motion.
 * Used to disable 3D scenes, confetti, and large animations.
 * SSR-safe: defaults to `false` until mounted, then syncs with the media query.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
