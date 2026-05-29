"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, inputClass } from "@/lib/styles";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is enabled there is no active session yet.
    if (!data.session) {
      setNotice(
        "Almost there — check your email to confirm your account, then sign in.",
      );
      setLoading(false);
      return;
    }
    router.replace("/welcome");
    router.refresh();
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="mb-1 text-xl text-ink">Plant your roots</h2>
      <p className="mb-5 text-sm text-muted">
        Create an account to start your family&apos;s garden.
      </p>
      {notice ? (
        <p className="rounded-xl bg-sage-light/60 p-4 text-sm text-sage-dark">
          {notice}
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
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (at least 6 characters)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-sm text-terracotta-dark">{error}</p>}
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Preparing the soil…" : "Create account"}
          </button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-sage-dark">
          Sign in
        </Link>
      </p>
    </div>
  );
}
