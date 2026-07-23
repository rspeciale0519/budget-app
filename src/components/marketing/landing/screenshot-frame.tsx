import Image from "next/image";
import { cn } from "@/lib/utils";

// Product screenshots are captured in the app's dark theme, so they read as a
// lit instrument. The frame is ink with a faint green ambient glow — never a
// pale card that melts into the paper.
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
    <figure className={cn("relative", className)}>
      {/* Ambient glow lifts the dark panel off the paper. */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[20px] opacity-60"
        style={{
          background: "radial-gradient(60% 60% at 50% 40%, color-mix(in oklab, var(--credit) 22%, transparent), transparent 75%)",
        }}
      />
      <div className="relative overflow-hidden rounded-card border border-ink/70 bg-[#14140f] shadow-overlay">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#1b1b14] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
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
      </div>
    </figure>
  );
}
