"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";

type Mode = "signin" | "signup" | "reset";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const supabase = createBrowserClient();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setError(friendlyAuthError(error.message));
      else router.push("/");
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setBusy(false);
      if (error) setError(friendlyAuthError(error.message));
      else setNotice("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });
      setBusy(false);
      if (error) setError(friendlyAuthError(error.message));
      else setNotice("If that email has an account, a reset link is on its way.");
    }
  }

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleBusy(false);
      setError(friendlyAuthError(error.message));
    }
    // On success the browser navigates away; leave the busy state on.
  }

  if (notice) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">{notice}</p>
        <Button type="button" variant="outline" className="w-full" onClick={() => switchMode("signin")}>
          Back to sign in
        </Button>
      </div>
    );
  }

  const submitLabel =
    mode === "signin"
      ? busy
        ? "Signing in…"
        : "Sign in"
      : mode === "signup"
        ? busy
          ? "Creating account…"
          : "Create account"
        : busy
          ? "Sending link…"
          : "Send reset link";

  return (
    /* A real form: Enter submits, and password managers can see the fields. */
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
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

      {mode !== "reset" && (
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}

      {error && <FieldError>{error}</FieldError>}

      <Button type="submit" variant="credit" disabled={busy} className="w-full">
        {submitLabel}
      </Button>

      <div className="flex items-center justify-between text-xs">
        {mode === "signin" ? (
          <>
            <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-now hover:underline">
              Create an account
            </button>
            <button type="button" onClick={() => switchMode("reset")} className="text-muted hover:text-ink hover:underline">
              Forgot password?
            </button>
          </>
        ) : (
          <button type="button" onClick={() => switchMode("signin")} className="text-muted hover:text-ink hover:underline">
            ← Back to sign in
          </button>
        )}
      </div>

      {mode === "signin" && (
        <>
          <div className="flex items-center gap-3 py-0.5">
            <span className="h-px flex-1 bg-rule" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">or</span>
            <span className="h-px flex-1 bg-rule" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={signInWithGoogle}
            disabled={googleBusy}
            className="w-full"
          >
            {googleBusy ? "Opening Google…" : "Continue with Google"}
          </Button>
        </>
      )}
    </form>
  );
}
