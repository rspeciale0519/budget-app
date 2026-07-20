import type { NextConfig } from "next";

// CSP notes: Next.js App Router hydration needs inline scripts, so script-src
// keeps 'unsafe-inline' (nonce-based CSP is a future tightening). 'unsafe-eval'
// is dev-only (React refresh). connect-src must cover Supabase REST + realtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^http/, "ws");
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Lets the dev server (HMR socket + JS chunks) be reached over Tailscale,
  // e.g. for testing on a phone. Without this, Next.js silently blocks
  // /_next/* requests from any origin it doesn't recognize.
  allowedDevOrigins: ["robs-asus2.tailc1936f.ts.net", "100.74.194.24"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
