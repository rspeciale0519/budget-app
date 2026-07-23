import { buildRssXml } from "@/lib/rss";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-static";

export function GET() {
  const xml = buildRssXml(getAllPosts());
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
