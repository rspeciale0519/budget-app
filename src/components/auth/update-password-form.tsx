"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const { error } = await createBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1200);
  }

  if (done) {
    return <p className="text-sm text-ink">Password updated — taking you to your dashboard…</p>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" variant="credit" disabled={busy || password.length === 0} className="w-full">
        {busy ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
