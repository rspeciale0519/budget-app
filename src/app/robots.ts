import type { MetadataRoute } from "next";
import { site } from "@/lib/site-config";

const BASE = `https://${site.domain}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep the authenticated app and API out of the index.
        disallow: ["/all", "/w/", "/tiles", "/settings", "/api/", "/auth/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
