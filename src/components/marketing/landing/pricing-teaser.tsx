import Link from "next/link";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { PricingCards } from "../pricing-cards";

export function PricingTeaser() {
  return (
    <Section
      eyebrow="Pricing"
      title="Plans that grow with what you run."
      intro="Start free for 14 days on any plan. Move up only when you add a business or a teammate — never to unlock the basics."
    >
      <PricingCards />
      <Reveal className="mt-8 text-center">
        <Link href="/pricing" className="text-sm text-now underline underline-offset-4 hover:text-ink">
          Compare every plan in detail →
        </Link>
      </Reveal>
    </Section>
  );
}
