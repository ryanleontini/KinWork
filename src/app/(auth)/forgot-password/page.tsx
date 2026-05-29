"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, inputClass } from "@/lib/styles";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError("Something went sideways — want to try again?");
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="mb-1 text-xl text-ink">Reset your password</h2>
      <p className="mb-5 text-sm text-muted">
        Tell us your email and we&apos;ll send you a link to set a new one.
      </p>
      {sent ? (
        <p className="rounded-xl bg-sage-light/60 p-4 text-sm text-sage-dark">
          If an account exists for that email, a reset link is on its way. Check
          your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-sm text-terracotta-dark">{error}</p>}
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-sage-dark">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
