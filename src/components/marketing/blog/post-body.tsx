import type { Block } from "@/lib/blog";

// Renders a post's structured blocks. No markdown parsing — the content model is
// small and typed, so rendering is a direct, safe map.
export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-muted">
      {blocks.map((block, i) => {
        switch (block.t) {
          case "h2":
            return (
              <h2 key={i} className="pt-4 font-serif text-2xl font-medium tracking-[-0.01em] text-ink">
                {block.text}
              </h2>
            );
          case "p":
            return <p key={i}>{block.text}</p>;
          case "ul":
            return (
              <ul key={i} className="space-y-2.5">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-ink">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-credit" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-credit pl-5 font-serif text-xl leading-snug text-ink">
                {block.text}
              </blockquote>
            );
        }
      })}
    </div>
  );
}
