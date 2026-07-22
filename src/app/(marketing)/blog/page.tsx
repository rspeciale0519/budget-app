import type { Metadata } from "next";
import { PageStub } from "@/components/marketing/page-stub";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <PageStub
      eyebrow="Blog"
      title="Field notes on money for people who run things."
      blurb="Practical writing on separating personal and business finances, paying yourself, and cash-flow forecasting. Posts land here next."
    />
  );
}
