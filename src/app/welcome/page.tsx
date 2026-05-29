"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, inputClass } from "@/lib/styles";

type Mode = "choose" | "create" | "join";

export default function WelcomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [displayName, setDisplayName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function logOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function getUserId() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return null;
    }
    return user.id;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const userId = await getUserId();
    if (!userId) return;

    const { data: family, error: famErr } = await supabase
      .from("families")
      .insert({
        name: familyName.trim(),
        tagline: "Here's what's been happening lately.",
        created_by: userId,
      })
      .select()
      .single();

    if (famErr || !family) {
      setError("We couldn't plant your family just yet. Want to try again?");
      setLoading(false);
      return;
    }

    const { error: memErr } = await supabase.from("family_members").insert({
      family_id: family.id,
      user_id: userId,
      role: "kinkeeper",
      display_name: displayName.trim(),
    });

    if (memErr) {
      setError("Something went sideways adding you to the family.");
      setLoading(false);
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const userId = await getUserId();
    if (!userId) return;

    const { error: rpcErr } = await supabase.rpc("accept_invite", {
      p_code: code.trim(),
      p_display_name: displayName.trim(),
    });

    if (rpcErr) {
      setError(
        rpcErr.message ||
          "We couldn't add you to the family. Want to try again?",
      );
      setLoading(false);
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl text-ink">Welcome to KinOS</h1>
          <p className="mt-1 text-sm text-muted">
            Let&apos;s get you settled into a family.
          </p>
        </div>

        {mode === "choose" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode("create")}
              className={`${card} flex items-center gap-4 p-5 text-left transition hover:shadow-lift`}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-sage-light text-sage-dark">
                <Sprout className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-ink">Start a family</p>
                <p className="text-sm text-muted">
                  Create a new garden and invite your people.
                </p>
              </div>
            </button>
            <button
              onClick={() => setMode("join")}
              className={`${card} flex items-center gap-4 p-5 text-left transition hover:shadow-lift`}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-terracotta-light text-terracotta-dark">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-ink">Join a family</p>
                <p className="text-sm text-muted">
                  Have an invite code? Hop right in.
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className={`${card} flex flex-col gap-3 p-6`}>
            <h2 className="text-lg text-ink">Start your family</h2>
            <input
              required
              placeholder="Your name (e.g. Grandma Sarah)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
            <input
              required
              placeholder="Family name (e.g. The Miller Family)"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className={inputClass}
            />
            {error && <p className="text-sm text-terracotta-dark">{error}</p>}
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "Planting…" : "Create family"}
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-sm text-muted"
            >
              ← Back
            </button>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className={`${card} flex flex-col gap-3 p-6`}>
            <h2 className="text-lg text-ink">Join a family</h2>
            <input
              required
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
            <input
              required
              placeholder="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${inputClass} uppercase tracking-widest`}
            />
            {error && <p className="text-sm text-terracotta-dark">{error}</p>}
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "Joining…" : "Join family"}
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-sm text-muted"
            >
              ← Back
            </button>
          </form>
        )}

        <button
          onClick={logOut}
          className="mt-6 w-full text-center text-sm text-muted"
        >
          Logged in as someone else?{" "}
          <span className="font-semibold text-terracotta-dark">Log out</span>
        </button>
      </div>
    </div>
  );
}
