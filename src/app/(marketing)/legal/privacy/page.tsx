import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <h2>1. What we collect</h2>
      <p>Placeholder privacy policy. The final policy must accurately describe real data practices before launch.</p>
      <h2>2. How your financial data is handled</h2>
      <p>Storage, encryption, access controls, and data isolation between books will be described here.</p>
      <h2>3. Your rights</h2>
      <p>Export and deletion of your data will be described here.</p>
    </LegalPage>
  );
}
