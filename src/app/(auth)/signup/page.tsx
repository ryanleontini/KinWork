"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, inputClass } from "@/lib/styles";
import {
  PasswordChecklist,
  isPasswordValid,
} from "@/components/PasswordChecklist";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordOk = isPasswordValid(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordOk) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Supabase returns a user with an empty identities array when the email
    // already exists (to avoid leaking which emails are registered).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError(
        "That email is already in use. Try signing in instead.",
      );
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
            placeholder="Password"
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
