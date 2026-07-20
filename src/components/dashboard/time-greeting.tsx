"use client";

import { useSyncExternalStore } from "react";

// The greeting depends on the viewer's local clock, which only exists on the
// client — read it as an external store so there's no server/client mismatch and
// no timezone drift. Renders nothing until hydrated.
function getGreeting(): string {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `Good ${part} — here's everything as of today.`;
}

export function TimeGreeting() {
  const greeting = useSyncExternalStore(
    () => () => {},
    getGreeting,
    () => "",
  );
  if (!greeting) return null;
  return <p className="text-sm text-muted">{greeting}</p>;
}
