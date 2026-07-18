const MAP: Record<string, string> = {
  "Invalid login credentials":
    "That email and password don't match. Try again, or use “Forgot password?” below.",
  "Email not confirmed": "Check your inbox — you need to confirm your email before signing in.",
  "User already registered": "An account with that email already exists. Sign in instead.",
};

/** Translate Supabase auth errors into plain language; unknown errors keep their detail. */
export function friendlyAuthError(message: string): string {
  return MAP[message] ?? `Sign-in failed: ${message}`;
}
