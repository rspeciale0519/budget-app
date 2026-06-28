"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

/** Theme-aware toast host. Mount once near the root. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
        },
      }}
    />
  );
}
