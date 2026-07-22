import type { Metadata } from "next";
import { PageStub } from "@/components/marketing/page-stub";

export const metadata: Metadata = { title: "Start your free trial" };

export default function SignupPage() {
  return (
    <PageStub
      eyebrow="Start free trial"
      title="Pick a plan and start your 14-day trial."
      blurb="Plan selection and secure checkout land here next. Billing is handled in a separate release; this page will hand off to Stripe."
    />
  );
}
