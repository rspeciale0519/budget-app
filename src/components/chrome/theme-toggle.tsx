"use client";

import { useCallback, useSyncExternalStore } from "react";
import { applyTheme, type Theme } from "@/lib/theme";

/*
  The real theme lives on <html data-theme>, set by the boot script before
  hydration. Reading it as an external store (rather than mirroring into state
  from an effect) is the idiomatic way to stay in sync without a setState-in-
  effect cascade, and useSyncExternalStore handles the server/client snapshot
  gap for us.
*/
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = useCallback(() => applyTheme(theme === "dark" ? "light" : "dark"), [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      className="grid h-8 w-8 place-items-center rounded-control border border-rule bg-surface text-[15px] text-muted transition-colors hover:border-dim hover:bg-raised hover:text-ink"
    >
      <span aria-hidden suppressHydrationWarning>
        {theme === "light" ? "☾" : "☀"}
      </span>
    </button>
  );
}
