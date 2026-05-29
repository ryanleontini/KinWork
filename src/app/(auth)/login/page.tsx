"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, inputClass } from "@/lib/styles";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("That email and password didn't match. Want to try again?");
      setLoading(false);
      return;
    }
    router.replace("/home");
    router.refresh();
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="mb-1 text-xl text-ink">Welcome back</h2>
      <p className="mb-5 text-sm text-muted">
        Sign in to step back into the garden.
      </p>
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-terracotta-dark">{error}</p>}
        <button type="submit" disabled={loading} className={btnPrimary}>
          {loading ? "Opening the gate…" : "Sign in"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-sage-dark">
          Create an account
        </Link>
      </p>
    </div>
  );
}
