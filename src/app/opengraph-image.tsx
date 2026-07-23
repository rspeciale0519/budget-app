import { ImageResponse } from "next/og";
import { site } from "@/lib/site-config";

export const alt = `${site.name} — personal + business, side by side`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded, placeholder-name-safe OG image. Reads the product name from
// site-config so a rename needs no change here.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f1f0ea",
          padding: "80px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1d1b17" }} />
          <div style={{ fontSize: 34, color: "#1d1b17", fontWeight: 600 }}>{site.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 30, letterSpacing: 4, color: "#1f6b4a", textTransform: "uppercase" }}>
            Personal + business, side by side
          </div>
          <div style={{ fontSize: 76, color: "#1d1b17", lineHeight: 1.05, fontWeight: 600 }}>
            All your money. Every business. One screen.
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#6a655b" }}>
          Know what&apos;s owed, what&apos;s due, and what&apos;s safe to spend.
        </div>
      </div>
    ),
    size,
  );
}
