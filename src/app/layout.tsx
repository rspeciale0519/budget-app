import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { site } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${site.domain}`),
  title: { template: `%s — ${site.name}`, default: site.name },
  description: "Know what's owed, what's due, and what's safe to spend.",
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.name,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: site.name, description: site.description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f0ea" },
    { media: "(prefers-color-scheme: dark)", color: "#14140f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`h-full antialiased ${fontVariables}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  );
}
