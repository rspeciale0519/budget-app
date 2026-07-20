import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

async function getHeaders(): Promise<Record<string, string>> {
  const rules = await nextConfig.headers!();
  const all = rules.find((r) => r.source === "/(.*)");
  expect(all).toBeDefined();
  return Object.fromEntries(all!.headers.map((h) => [h.key, h.value]));
}

describe("security headers", () => {
  it("sets the core protection headers on every route", async () => {
    const h = await getHeaders();
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Strict-Transport-Security"]).toContain("max-age=");
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });

  it("CSP restricts framing, objects, and connect targets to self + Supabase", async () => {
    const h = await getHeaders();
    const csp = h["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self'");
  });
});
