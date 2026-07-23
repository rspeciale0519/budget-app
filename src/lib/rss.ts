import { site } from "@/lib/site-config";
import type { Post } from "@/lib/blog";

const BASE = `https://${site.domain}`;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RSS 2.0 pubDate wants RFC-822. Build it from the fixed YYYY-MM-DD (UTC noon so
// the date can't slip across a timezone) without relying on the current clock.
function rfc822(date: string): string {
  return new Date(`${date}T12:00:00Z`).toUTCString();
}

export function buildRssXml(posts: Post[]): string {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${BASE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${p.slug}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.name)} — Blog</title>
    <link>${BASE}/blog</link>
    <description>${escapeXml(site.description)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;
}
