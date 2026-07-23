import { LedgerHero } from "./landing/ledger-hero";
import { LedgerTicker } from "./landing/ledger-ticker";
import { ProductProof } from "./landing/product-proof";
import { Problem } from "./landing/problem";
import { Features } from "./landing/features";
import { BridgeSection } from "./landing/bridge-section";
import { Trust } from "./landing/trust";
import { PricingTeaser } from "./landing/pricing-teaser";
import { FaqTeaser } from "./landing/faq-teaser";
import { FinalCta } from "./landing/final-cta";

export function Landing() {
  return (
    <>
      <LedgerHero />
      <LedgerTicker />
      <ProductProof />
      <Problem />
      <Features />
      <BridgeSection />
      <Trust />
      <PricingTeaser />
      <FaqTeaser />
      <FinalCta />
    </>
  );
}
