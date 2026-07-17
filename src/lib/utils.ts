import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type { ClassValue };

/**
 * Merge class names so later classes win. Without tailwind-merge, `cn("bg-surface",
 * "bg-transparent")` emits both and source order decides — every `className`
 * override passed into a primitive would silently no-op.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
