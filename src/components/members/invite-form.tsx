"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { inviteAction } from "@/app/(app)/settings/_actions";

export function InviteForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    setError(null);
    setDone(false);
    const result = await inviteAction(organizationId, email);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Failed");
    else {
      setDone(true);
      setEmail("");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="email"
        placeholder="teammate@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="grow rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <Button disabled={busy || !email} onClick={invite}>
        {busy ? "Inviting…" : "Invite"}
      </Button>
      {done && <span className="text-sm text-emerald-700">Invitation sent.</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
