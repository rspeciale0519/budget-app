import type { MetadataRoute } from "next";
import { site } from "@/lib/site-config";
import { getAllPosts } from "@/lib/blog";

const BASE = `https://${site.domain}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/features", "/pricing", "/demo", "/about", "/blog", "/faq", "/signup", "/legal/terms", "/legal/privacy", "/legal/refunds"];
  const staticPages: MetadataRoute.Sitemap = routes.map((r) => ({
    url: `${BASE}${r}`,
    changeFrequency: "monthly",
    priority: r === "" ? 1 : 0.7,
  }));
  const posts: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.date,
    changeFrequency: "yearly",
    priority: 0.5,
  }));
  return [...staticPages, ...posts];
}
