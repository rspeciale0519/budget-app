import type { Metadata } from "next";
import { PageStub } from "@/components/marketing/page-stub";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageStub
      eyebrow="About"
      title="Built by an owner-operator, for owner-operators."
      blurb="The story of why off-the-shelf tools never fit running a household and several businesses at once — lands here next."
    />
  );
}
