import { Hero } from "./landing/hero";
import { Problem } from "./landing/problem";
import { Features } from "./landing/features";
import { Trust } from "./landing/trust";
import { PricingTeaser } from "./landing/pricing-teaser";
import { FaqTeaser } from "./landing/faq-teaser";
import { FinalCta } from "./landing/final-cta";

export function Landing() {
  return (
    <>
      <Hero />
      <Problem />
      <Features />
      <Trust />
      <PricingTeaser />
      <FaqTeaser />
      <FinalCta />
    </>
  );
}
