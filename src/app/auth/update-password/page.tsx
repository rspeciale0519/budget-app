import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Update password" };

export default async function UpdatePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-[340px]">
        <h1 className="mb-6 text-center text-xl font-semibold text-ink">Choose a new password</h1>
        <div className="rounded-card border border-rule-strong bg-surface/90 p-5 shadow-overlay">
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  );
}
