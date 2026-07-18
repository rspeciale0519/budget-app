"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  message: string;
  kind: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastOpts {
  kind?: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

const ToastContext = createContext<{ toast: (message: string, opts?: ToastOpts) => void } | null>(
  null,
);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, opts: ToastOpts = {}) => {
    const id = ++nextId.current;
    setItems((cur) => [
      ...cur,
      { id, message, kind: opts.kind ?? "success", actionLabel: opts.actionLabel, onAction: opts.onAction },
    ]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), opts.durationMs ?? 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 rounded-control border px-3 py-2.5 text-sm shadow-lg",
              t.kind === "error"
                ? "border-alert/40 bg-alert-tint text-alert"
                : "border-rule-strong bg-raised text-ink",
            )}
          >
            <span>{t.message}</span>
            {t.actionLabel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  t.onAction?.();
                  setItems((cur) => cur.filter((x) => x.id !== t.id));
                }}
              >
                {t.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
