import { MarketingShell } from "@/components/marketing/marketing-shell";

// Force the light "Sterling" identity for the public site regardless of any
// stored app theme preference — the marketing brand is light-first.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
