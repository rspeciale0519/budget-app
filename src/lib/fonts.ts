import { Geist, Geist_Mono } from "next/font/google";

/**
 * Two roles, one family. Geist carries the whole interface — hierarchy comes
 * from weight and size, not from a second display face. Geist Mono renders every
 * figure: money is data, and data is tabular.
 *
 * Self-hosted at build time by next/font, so no runtime network request and no
 * layout shift on first paint.
 */
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const fontVariables = [geist.variable, geistMono.variable].join(" ");
