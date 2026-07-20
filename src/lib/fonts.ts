import { Fraunces, Geist, Geist_Mono } from "next/font/google";

/**
 * Three roles. Geist carries the whole interface — hierarchy comes from weight
 * and size. Geist Mono renders every figure: money is data, and data is tabular.
 * Fraunces is the masthead face — the engraved-ledger serif reserved for the
 * brand mark, the book-identity header, and the sign-in wordmark. It never sets
 * body copy, labels, or figures.
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

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: "variable",
  axes: ["opsz", "SOFT"],
});

export const fontVariables = [geist.variable, geistMono.variable, fraunces.variable].join(" ");
