import type { Metadata } from "next";
import { PageStub } from "@/components/marketing/page-stub";

export const metadata: Metadata = { title: "Features" };

export default function FeaturesPage() {
  return (
    <PageStub
      eyebrow="Features"
      title="Everything an owner-operator needs — nothing an accountant demands."
      blurb="Isolated books, a side-by-side roll-up, cash-flow forecasting, and the owner-draw bridge. The full tour lands here next."
    />
  );
}
