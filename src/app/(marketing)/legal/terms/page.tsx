import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <h2>1. Agreement</h2>
      <p>Placeholder terms. Final, counsel-reviewed language will replace this before launch.</p>
      <h2>2. Subscriptions & trials</h2>
      <p>Plans, the 14-day trial, billing, and cancellation will be described here.</p>
      <h2>3. Acceptable use</h2>
      <p>How the service may and may not be used will be described here.</p>
    </LegalPage>
  );
}
