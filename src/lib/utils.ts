export type ClassValue = string | false | null | undefined;

/** Minimal className joiner (shadcn-compatible `cn` surface). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
