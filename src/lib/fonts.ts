import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";

/**
 * Three roles, deliberately not Inter.
 *
 * - Instrument Sans carries the interface.
 * - Instrument Serif appears only on statement numbers and the sign-in hero. It
 *   is the one voice in the app that is allowed to be beautiful rather than
 *   useful, so it is rationed.
 * - JetBrains Mono renders every figure. Money is data; data is tabular.
 *
 * Self-hosted at build time by next/font, so no runtime network request and no
 * layout shift on first paint.
 */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontVariables = [
  instrumentSans.variable,
  instrumentSerif.variable,
  jetbrainsMono.variable,
].join(" ");
