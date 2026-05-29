"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  LogOut,
  Pencil,
  Check,
  Copy,
  Share2,
  Trash2,
  Camera,
  Crown,
  DoorOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { Avatar, Spinner } from "@/components/ui";
import { makeInviteCode } from "@/lib/format";
import { uploadToMedia, UploadError } from "@/lib/upload";
import { btnPrimary, btnSecondary, card, inputClass } from "@/lib/styles";
import { timeUntil } from "@/lib/format";
import type { Family, FamilyMember, Invite } from "@/lib/types";

export default function FamilyPage() {
  const router = useRouter();
  const { family: initialFamily, member, userId } = useApp();
  const supabase = useMemo(() => createClient(), []);

  const [family, setFamily] = useState<Family>(initialFamily);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(family.name);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const isKinkeeper = member.role === "kinkeeper";

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("family_id", family.id)
      .order("joined_at", { ascending: true });
    setMembers(data ?? []);
    setLoading(false);
  }, [supabase, family.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveName() {
    if (!nameDraft.trim()) return;
    await supabase
      .from("families")
      .update({ name: nameDraft.trim() })
      .eq("id", family.id);
    setFamily((f) => ({ ...f, name: nameDraft.trim() }));
    setEditingName(false);
    router.refresh();
  }

  async function changePhoto(file: File) {
    setBusy(true);
    setPhotoError(null);
    try {
      const { url } = await uploadToMedia(supabase, file, userId);
      await supabase.from("families").update({ photo_url: url }).eq("id", family.id);
      setFamily((f) => ({ ...f, photo_url: url }));
      router.refresh();
    } catch (e) {
      setPhotoError(
        e instanceof UploadError
          ? e.message
          : "Couldn't update the photo — please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const inviteLink = invite
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${invite.invite_code}`
    : null;

  async function createInvite() {
    setBusy(true);
    const code = makeInviteCode();
    const { data, error } = await supabase
      .from("invites")
      .insert({
        family_id: family.id,
        invited_by: userId,
        invite_code: code,
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) return;
    setInvite(data as Invite);
    setCopied(false);
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!inviteLink || !invite) return;
    if (navigator.share) {
      await navigator
        .share({
          title: `Join ${family.name} on KinOS`,
          text: `You're invited to ${family.name}! Use code ${invite.invite_code}.`,
          url: inviteLink,
        })
        .catch(() => {});
    } else {
      copyLink();
    }
  }

  async function revokeInvite() {
    if (!invite) return;
    if (
      !confirm(
        "Revoke this invite link? It will stop working immediately.",
      )
    )
      return;
    // Setting max_uses to used_count makes the cap check fail on any future attempt.
    await supabase
      .from("invites")
      .update({ max_uses: invite.used_count })
      .eq("id", invite.id);
    setInvite(null);
  }

  async function removeMember(m: FamilyMember) {
    if (!confirm(`Remove ${m.display_name} from the family?`)) return;
    await supabase.from("family_members").delete().eq("id", m.id);
    load();
  }

  async function leaveFamily() {
    if (!confirm("Leave this family? You can rejoin with an invite later.")) return;
    await supabase.from("family_members").delete().eq("id", member.id);
    router.replace("/welcome");
    router.refresh();
  }

  async function logOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="pb-6">
      <header className="px-5 pt-8 pb-2">
        <h1 className="text-3xl text-ink">Family</h1>
      </header>

      <section className={`${card} mx-4 flex flex-col items-center gap-3 p-6`}>
        <div className="relative">
          <Avatar name={family.name} url={family.photo_url} size={88} />
          {isKinkeeper && (
            <button
              onClick={() => photoRef.current?.click()}
              disabled={busy}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-sage text-white shadow-soft"
              aria-label="Change family photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) changePhoto(f);
            }}
          />
        </div>

        {editingName ? (
          <div className="flex w-full items-center gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={saveName}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage text-white"
              aria-label="Save name"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-2xl text-ink">{family.name}</h2>
            {isKinkeeper && (
              <button
                onClick={() => {
                  setNameDraft(family.name);
                  setEditingName(true);
                }}
                className="text-muted"
                aria-label="Edit family name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {family.tagline && (
          <p className="text-center text-sm text-muted">{family.tagline}</p>
        )}
        {photoError && (
          <p className="text-center text-sm text-terracotta-dark">{photoError}</p>
        )}
      </section>

      <section className="mt-5 px-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg text-ink">Members</h3>
          <button onClick={createInvite} disabled={busy} className={`${btnSecondary} py-2`}>
            <UserPlus className="h-4 w-4" /> Invite
          </button>
        </div>

        {invite && inviteLink && (
          <div className={`${card} mb-3 p-4`}>
            <p className="text-sm text-muted">Share this invite:</p>
            <p className="my-1 text-center text-2xl font-semibold tracking-widest text-sage-dark">
              {invite.invite_code}
            </p>
            <p className="mb-2 truncate text-center text-xs text-muted">
              {inviteLink}
            </p>
            <p className="mb-3 text-center text-xs text-muted">
              {invite.used_count} of {invite.max_uses} joins used · expires{" "}
              {timeUntil(invite.expires_at)}
            </p>
            <div className="flex gap-2">
              <button onClick={copyLink} className={`${btnSecondary} flex-1 py-2`}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button onClick={shareLink} className={`${btnPrimary} flex-1 py-2`}>
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
            <button
              onClick={revokeInvite}
              className="mt-2 w-full py-2 text-sm text-terracotta-dark"
            >
              Revoke link
            </button>
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : (
          <div className={`${card} divide-y divide-line`}>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <Avatar name={m.display_name} url={m.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{m.display_name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    {m.role === "kinkeeper" && (
                      <Crown className="h-3 w-3 text-terracotta" />
                    )}
                    {m.role === "kinkeeper" ? "Kinkeeper" : "Member"}
                    {m.user_id === userId && " · You"}
                  </p>
                </div>
                {isKinkeeper && m.user_id !== userId && m.role !== "kinkeeper" && (
                  <button
                    onClick={() => removeMember(m)}
                    className="p-2 text-muted hover:text-terracotta-dark"
                    aria-label={`Remove ${m.display_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 flex flex-col gap-2 px-4">
        {!isKinkeeper && (
          <button onClick={leaveFamily} className={btnSecondary}>
            <DoorOpen className="h-5 w-5" /> Leave family
          </button>
        )}
        <button
          onClick={logOut}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-terracotta-dark"
        >
          <LogOut className="h-5 w-5" /> Log out
        </button>
      </section>
    </div>
  );
}
