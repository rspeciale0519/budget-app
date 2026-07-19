import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The one page-title style for the whole app: text-xl semibold ink. Keeps
 * every page heading in agreement so new pages can't drift. Not for the login
 * brand mark, the error/not-found pages, or the serif book-identity header —
 * those are deliberately their own thing. */
export function PageHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn("text-xl font-semibold text-ink", className)}>{children}</h1>;
}
