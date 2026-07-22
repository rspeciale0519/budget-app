import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy" updated="July 2026">
      <h2>1. The free trial</h2>
      <p>Placeholder refund policy. You will not be charged during the 14-day trial; final terms land here before launch.</p>
      <h2>2. Cancellation</h2>
      <p>How and when you can cancel, and what happens to your data, will be described here.</p>
      <h2>3. Refunds</h2>
      <p>The refund window and process will be described here.</p>
    </LegalPage>
  );
}
