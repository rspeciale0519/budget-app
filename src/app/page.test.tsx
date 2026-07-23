import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression guard for the "/" split introduced with the marketing site:
// anonymous visitors must see the landing (no redirect to /login), and every
// authenticated dispatch must behave exactly as it did before.
const getCurrentUser = vi.fn();
const listAccessibleWorkspaces = vi.fn();
const bootstrapOrgForUser = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/services/authz", () => ({ listAccessibleWorkspaces: (id: string) => listAccessibleWorkspaces(id) }));
vi.mock("@/services/membership-service", () => ({ bootstrapOrgForUser: (id: string) => bootstrapOrgForUser(id) }));
vi.mock("next/navigation", () => ({ redirect: (p: string) => redirect(p) }));

import Home from "./page";

beforeEach(() => vi.clearAllMocks());

describe("/ root dispatch", () => {
  it("renders the marketing landing for anonymous visitors without redirecting", async () => {
    getCurrentUser.mockResolvedValue(null);
    const el = await Home();
    expect(redirect).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });

  it("still sends a multi-book user to /all", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    listAccessibleWorkspaces.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    await expect(Home()).rejects.toThrow("REDIRECT:/all");
  });

  it("still sends a single-book user straight to their book", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    listAccessibleWorkspaces.mockResolvedValue([{ id: "ws1" }]);
    await expect(Home()).rejects.toThrow("REDIRECT:/w/ws1");
  });

  it("still bootstraps a brand-new user, then dispatches to their new book", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    listAccessibleWorkspaces.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "ws1" }]);
    await expect(Home()).rejects.toThrow("REDIRECT:/w/ws1");
    expect(bootstrapOrgForUser).toHaveBeenCalledWith("u1");
  });
});
