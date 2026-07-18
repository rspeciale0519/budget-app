"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-sm space-y-3 text-center">
        <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="text-sm text-muted">
          Your data is safe — this page just failed to load. Try again, and if it keeps happening,
          reload the app.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
