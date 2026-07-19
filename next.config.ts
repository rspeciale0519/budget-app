import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server (HMR socket + JS chunks) be reached over Tailscale,
  // e.g. for testing on a phone. Without this, Next.js silently blocks
  // /_next/* requests from any origin it doesn't recognize.
  allowedDevOrigins: ["robs-asus2.tailc1936f.ts.net", "100.74.194.24"],
};

export default nextConfig;
