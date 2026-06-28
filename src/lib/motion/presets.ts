import type { Transition, Variants } from "framer-motion";

/**
 * Shared "max fun" motion presets — springy, playful, but reusable.
 * Components pair these with prefers-reduced-motion fallbacks.
 */

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 26,
  mass: 0.7,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

/** Page/section entrance: rise + fade. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: springSoft,
  },
};

/** Staggered container for lists/grids of cards. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** Individual item used inside staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springBouncy,
  },
};

/** Interactive card/button hover + tap. */
export const pressable = {
  whileHover: { scale: 1.02, y: -2 },
  whileTap: { scale: 0.97 },
  transition: springBouncy,
};
