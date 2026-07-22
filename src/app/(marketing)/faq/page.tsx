import type { Metadata } from "next";
import { PageStub } from "@/components/marketing/page-stub";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <PageStub
      eyebrow="FAQ"
      title="Questions worth answering before you trust us with your money."
      blurb="Security, bank support, importing, refunds, and cancellation — answered plainly. The full FAQ lands here next."
    />
  );
}
