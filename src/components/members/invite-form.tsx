"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
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
      <Input
        type="email"
        placeholder="teammate@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="grow"
      />
      <Button disabled={busy || !email} onClick={invite}>
        {busy ? "Inviting…" : "Invite"}
      </Button>
      {done && <span className="text-sm text-credit">Invitation sent.</span>}
      {error && <span className="text-sm text-alert">{error}</span>}
    </div>
  );
}
