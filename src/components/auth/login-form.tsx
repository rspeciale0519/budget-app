"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createBrowserClient();

  async function signInWithEmail() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else router.push("/");
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    /* A real form: Enter submits, and password managers can see the fields. */
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void signInWithEmail();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <FieldError>{error}</FieldError>}

      <Button type="submit" variant="credit" disabled={busy} className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex items-center gap-3 py-0.5">
        <span className="h-px flex-1 bg-rule" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">or</span>
        <span className="h-px flex-1 bg-rule" />
      </div>

      <Button type="button" variant="outline" onClick={signInWithGoogle} className="w-full">
        Continue with Google
      </Button>
    </form>
  );
}
