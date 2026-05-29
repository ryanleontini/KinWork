"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { Avatar, Spinner } from "@/components/ui";
import { clockTime } from "@/lib/format";
import { uploadToMedia } from "@/lib/upload";
import { inputClass } from "@/lib/styles";
import type { Message } from "@/lib/types";

const PAGE = 50;
type MemberInfo = { display_name: string; avatar_url: string | null };

export default function ChatPage() {
  const { family, userId } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("family_members")
      .select("user_id, display_name, avatar_url")
      .eq("family_id", family.id);
    const map: Record<string, MemberInfo> = {};
    (data ?? []).forEach((m) => {
      map[m.user_id] = { display_name: m.display_name, avatar_url: m.avatar_url };
    });
    setMembers(map);
  }, [supabase, family.id]);

  const loadInitial = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("family_id", family.id)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const ordered = (data ?? []).slice().reverse();
    setMessages(ordered);
    setHasMore((data ?? []).length === PAGE);
    setLoading(false);
  }, [supabase, family.id]);

  async function loadMore() {
    if (messages.length === 0) return;
    const earliest = messages[0].created_at;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("family_id", family.id)
      .lt("created_at", earliest)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const older = (data ?? []).slice().reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMore((data ?? []).length === PAGE);
  }

  useEffect(() => {
    loadMembers();
    loadInitial();
  }, [loadMembers, loadInitial]);

  // Realtime subscription for live messages.
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${family.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `family_id=eq.${family.id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, family.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);
    let mediaUrl: string | null = null;
    try {
      if (file) {
        const { url } = await uploadToMedia(supabase, file, userId);
        mediaUrl = url;
      }
      const { data: inserted } = await supabase
        .from("messages")
        .insert({
          family_id: family.id,
          sender_id: userId,
          content: text.trim() || (file ? "📷 Photo" : ""),
          media_url: mediaUrl,
        })
        .select()
        .single();
      // Optimistically show our own message immediately. The realtime
      // subscription (for other members' messages) dedupes by id.
      if (inserted) {
        setMessages((prev) =>
          prev.some((m) => m.id === inserted.id)
            ? prev
            : [...prev, inserted as Message],
        );
      }
      setText("");
      setFile(null);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      <header className="border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
        <h1 className="text-xl text-ink">Family Chat</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <Spinner label="Loading messages…" />
        ) : (
          <>
            {hasMore && (
              <div className="mb-4 flex justify-center">
                <button
                  onClick={loadMore}
                  className="rounded-full border border-line bg-paper px-4 py-1.5 text-sm text-sage-dark"
                >
                  Load earlier messages
                </button>
              </div>
            )}
            {messages.length === 0 && (
              <p className="mt-10 text-center text-sm text-muted">
                Say hello — this is the start of your family chat. 🌿
              </p>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((m) => {
                const mine = m.sender_id === userId;
                const who = members[m.sender_id];
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${
                      mine ? "flex-row-reverse" : ""
                    }`}
                  >
                    {!mine && (
                      <Avatar
                        name={who?.display_name ?? "Someone"}
                        url={who?.avatar_url}
                        size={30}
                      />
                    )}
                    <div className={`max-w-[75%] ${mine ? "items-end" : ""}`}>
                      {!mine && (
                        <p className="mb-0.5 ml-1 text-xs text-muted">
                          {who?.display_name ?? "Someone"}
                        </p>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2 ${
                          mine
                            ? "bg-sage text-white"
                            : "bg-paper text-ink shadow-soft"
                        }`}
                      >
                        {m.media_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.media_url}
                            alt=""
                            className="mb-1 max-h-60 rounded-lg object-cover"
                          />
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                      </div>
                      <p
                        className={`mt-0.5 text-[10px] text-muted ${
                          mine ? "text-right mr-1" : "ml-1"
                        }`}
                      >
                        {clockTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-line bg-paper px-3 py-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sage-dark"
          aria-label="Attach photo"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message your family…"
            className={`${inputClass} py-2.5`}
          />
          {file && (
            <span className="absolute -top-7 left-0 flex items-center gap-1 rounded-full bg-sage-light px-2 py-0.5 text-xs text-sage-dark">
              {file.name.slice(0, 18)}
              <button type="button" onClick={() => setFile(null)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={sending}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage text-white disabled:opacity-60"
          aria-label="Send"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
