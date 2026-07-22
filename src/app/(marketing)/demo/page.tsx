import type { Metadata } from "next";
import { PageStub } from "@/components/marketing/page-stub";

export const metadata: Metadata = { title: "Demo" };

export default function DemoPage() {
  return (
    <PageStub
      eyebrow="Demo"
      title="See a real morning review, start to finish."
      blurb="A guided walk through a live demo book — open the tiled view, check safe-to-spend, mark a bill paid, glance at the roll-up. The tour lands here next."
    />
  );
}
