import { describe, it, expect } from "vitest";
import { friendlyAuthError } from "@/lib/auth-errors";

describe("friendlyAuthError", () => {
  it("maps supabase auth errors to plain language", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe(
      "That email and password don't match. Try again, or use “Forgot password?” below.",
    );
    expect(friendlyAuthError("Email not confirmed")).toBe(
      "Check your inbox — you need to confirm your email before signing in.",
    );
    expect(friendlyAuthError("User already registered")).toBe(
      "An account with that email already exists. Sign in instead.",
    );
    expect(friendlyAuthError("weird upstream failure")).toBe(
      "Sign-in failed: weird upstream failure",
    );
  });
});
