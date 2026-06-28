"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * Smoothly animates a number from its previous value to `value`.
 * `format` controls how the displayed number is rendered (e.g. currency).
 * Falls back to instant text when reduced motion is requested.
 */
export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString(),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  if (reduced) {
    return <span className={className}>{format(value)}</span>;
  }

  return <motion.span className={className}>{display}</motion.span>;
}
