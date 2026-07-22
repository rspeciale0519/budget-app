import type { Metadata } from "next";
import { PageStub } from "@/components/marketing/page-stub";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <PageStub
      eyebrow="Pricing"
      title="Simple plans that grow with what you run."
      blurb="Three plans — Starter, Pro, and Team — with a 14-day free trial. The full comparison table lands here next."
    />
  );
}
