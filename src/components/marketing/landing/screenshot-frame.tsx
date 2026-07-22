import Image from "next/image";
import { cn } from "@/lib/utils";

// Real product screenshots framed in a quiet panel with a soft lift — the
// product does the selling, so the chrome stays out of its way.
export function ScreenshotFrame({
  src,
  alt,
  width = 1600,
  height = 1000,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-card border border-rule-strong bg-surface shadow-lift",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-rule bg-raised/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
      </div>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="block h-auto w-full"
        sizes="(max-width: 1120px) 100vw, 1120px"
      />
    </figure>
  );
}
