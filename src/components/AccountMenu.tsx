"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";

export function AccountMenu({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      )}
      <div className="fixed top-4 right-1/2 z-50 translate-x-[calc(min(50vw,16rem)-1rem)]">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          className="grid place-items-center rounded-full ring-2 ring-paper shadow-soft"
        >
          <Avatar name={name} url={avatarUrl} size={38} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-paper shadow-lift">
            <div className="border-b border-line px-4 py-3">
              <p className="text-xs text-muted">Signed in as</p>
              <p className="truncate font-semibold text-ink">{name}</p>
            </div>
            <button
              onClick={logOut}
              disabled={busy}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-terracotta-dark transition hover:bg-cream disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" />
              {busy ? "Logging out…" : "Log out"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
