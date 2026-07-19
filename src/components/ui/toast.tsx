"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  message: string;
  kind: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
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

/** One toast, owning its own auto-dismiss timer that pauses while hovered or
 * focused — so a slow reader (or someone reaching for Undo) never loses it. */
function ToastRow({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(item.durationMs);
  const startRef = useRef(0);
  const dismiss = useCallback(() => onClose(item.id), [item.id, onClose]);

  useEffect(() => {
    if (paused) return;
    startRef.current = Date.now();
    const t = setTimeout(dismiss, Math.max(0, remainingRef.current));
    return () => {
      clearTimeout(t);
      remainingRef.current -= Date.now() - startRef.current;
    };
  }, [paused, dismiss]);

  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex items-center justify-between gap-3 rounded-control border px-3 py-2.5 text-sm shadow-lg",
        item.kind === "error"
          ? "border-alert/40 bg-alert-tint text-alert"
          : "border-rule-strong bg-raised text-ink",
      )}
    >
      <span>{item.message}</span>
      <div className="flex shrink-0 items-center gap-1">
        {item.actionLabel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              item.onAction?.();
              dismiss();
            }}
          >
            {item.actionLabel}
          </Button>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="grid h-6 w-6 place-items-center rounded text-lg leading-none text-muted transition-colors hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const close = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, opts: ToastOpts = {}) => {
    const id = ++nextId.current;
    const kind = opts.kind ?? "success";
    setItems((cur) => [
      ...cur,
      {
        id,
        message,
        kind,
        actionLabel: opts.actionLabel,
        onAction: opts.onAction,
        // Errors linger longer than confirmations — they're the ones worth reading.
        durationMs: opts.durationMs ?? (kind === "error" ? 8000 : 5000),
      },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
      >
        {items.map((t) => (
          <ToastRow key={t.id} item={t} onClose={close} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
