"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, card, inputClass } from "@/lib/styles";
import { Spinner } from "@/components/ui";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthed(!!user);

      const { data: invite } = await supabase
        .from("invites")
        .select("family_id")
        .eq("invite_code", code)
        .maybeSingle();

      if (!invite) {
        setLoading(false);
        return;
      }
      setFamilyId(invite.family_id);

      const { data: family } = await supabase
        .from("families")
        .select("name")
        .eq("id", invite.family_id)
        .maybeSingle();

      setFamilyName(family?.name ?? "this family");
      setLoading(false);
    })();
  }, [code]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId) return;
    setJoining(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: rpcErr } = await supabase.rpc("accept_invite", {
      p_code: code,
      p_display_name: displayName.trim(),
    });

    if (rpcErr) {
      setError(
        rpcErr.message || "We couldn't add you just yet. Want to try again?",
      );
      setJoining(false);
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  if (loading) {
    return (
      <div className={`${card} p-6`}>
        <Spinner label="Finding your family…" />
      </div>
    );
  }

  if (!familyId) {
    return (
      <div className={`${card} p-6 text-center`}>
        <h2 className="mb-1 text-xl text-ink">That invite didn&apos;t work</h2>
        <p className="mb-4 text-sm text-muted">
          The code <span className="font-semibold">{code}</span> doesn&apos;t
          match an open invite. Ask whoever invited you for a fresh link.
        </p>
        <Link href="/login" className={btnSecondary + " w-full"}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="mb-1 text-xl text-ink">
        You&apos;re invited to {familyName}
      </h2>

      {authed ? (
        <form onSubmit={handleJoin} className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted">
            What should the family call you?
          </p>
          <input
            required
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-sm text-terracotta-dark">{error}</p>}
          <button type="submit" disabled={joining} className={btnPrimary}>
            {joining ? "Joining…" : `Join ${familyName}`}
          </button>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted">
            Create an account or sign in to join. Keep this code handy:{" "}
            <span className="font-semibold tracking-widest text-sage-dark">
              {code}
            </span>
          </p>
          <Link href="/signup" className={btnPrimary}>
            Create an account
          </Link>
          <Link href="/login" className={btnSecondary}>
            I already have one
          </Link>
        </div>
      )}
    </div>
  );
}
