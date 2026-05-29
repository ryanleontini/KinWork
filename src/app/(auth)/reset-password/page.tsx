"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, inputClass } from "@/lib/styles";
import {
  PasswordChecklist,
  isPasswordValid,
} from "@/components/PasswordChecklist";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("checking");

  const passwordOk = isPasswordValid(password);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Wait briefly for the SSR browser client to exchange the recovery code
    // from the URL and establish a session, then check.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setStatus(data.session ? "ready" : "invalid");
    };
    const timer = setTimeout(check, 400);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (!cancelled) setStatus("ready");
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordOk) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setStatus("done");
    setLoading(false);
    setTimeout(() => {
      router.replace("/home");
      router.refresh();
    }, 1200);
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="mb-1 text-xl text-ink">Choose a new password</h2>
      <p className="mb-5 text-sm text-muted">
        Pick something memorable but strong.
      </p>

      {status === "checking" && (
        <p className="text-sm text-muted">Just a moment…</p>
      )}

      {status === "invalid" && (
        <>
          <p className="rounded-xl bg-terracotta-light/40 p-4 text-sm text-terracotta-dark">
            This reset link is invalid or has expired. Want to request a new
            one?
          </p>
          <p className="mt-5 text-center text-sm text-muted">
            <Link
              href="/forgot-password"
              className="font-semibold text-sage-dark"
            >
              Send a new link
            </Link>
          </p>
        </>
      )}

      {status === "done" && (
        <p className="rounded-xl bg-sage-light/60 p-4 text-sm text-sage-dark">
          Password updated. Taking you home…
        </p>
      )}

      {status === "ready" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            placeholder="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <PasswordChecklist password={password} />
          {error && <p className="text-sm text-terracotta-dark">{error}</p>}
          <button
            type="submit"
            disabled={loading || !passwordOk}
            className={btnPrimary}
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
