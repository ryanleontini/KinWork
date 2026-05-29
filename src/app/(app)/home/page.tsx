"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Plus,
  X,
  ImagePlus,
  Send,
  BookOpen,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { Avatar, EmptyState, Spinner } from "@/components/ui";
import { uploadToMedia } from "@/lib/upload";
import { timeAgo } from "@/lib/format";
import { btnPrimary, inputClass } from "@/lib/styles";
import type { FeedPost } from "@/lib/types";

type MemberInfo = { display_name: string; avatar_url: string | null };

export default function HomePage() {
  const { family, userId } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: mems } = await supabase
      .from("family_members")
      .select("user_id, display_name, avatar_url")
      .eq("family_id", family.id);

    const map: Record<string, MemberInfo> = {};
    (mems ?? []).forEach((m) => {
      map[m.user_id] = {
        display_name: m.display_name,
        avatar_url: m.avatar_url,
      };
    });
    setMembers(map);

    const { data } = await supabase
      .from("posts")
      .select("*, post_media(*), reactions(*), comments(*)")
      .eq("family_id", family.id)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    const feed: FeedPost[] = (data ?? []).map((p) => ({
      ...p,
      author: map[p.author_id] ?? null,
      media: p.post_media ?? [],
      reactions: p.reactions ?? [],
      comments: (p.comments ?? [])
        .sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
        .map((c: { author_id: string }) => ({
          ...c,
          author: map[c.author_id] ?? null,
        })),
    }));
    setPosts(feed);
    setLoading(false);
  }, [supabase, family.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl text-ink">{family.name}</h1>
        {family.tagline && (
          <p className="mt-1 text-muted">{family.tagline}</p>
        )}
      </header>

      {loading ? (
        <Spinner label="Gathering the latest…" />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Your feed is ready to bloom"
          body="Share a photo or a few words to plant the first memory."
        />
      ) : (
        <div className="flex flex-col gap-4 px-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              members={members}
              onChange={load}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setComposerOpen(true)}
        aria-label="Create a post"
        className="fixed bottom-24 right-1/2 z-30 translate-x-[calc(min(50vw,16rem)-1.5rem)] grid h-14 w-14 place-items-center rounded-full bg-terracotta text-white shadow-lift transition hover:bg-terracotta-dark active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>

      {composerOpen && (
        <Composer
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  userId,
  members,
  onChange,
}: {
  post: FeedPost;
  userId: string;
  members: Record<string, MemberInfo>;
  onChange: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  const myReaction = post.reactions.find((r) => r.user_id === userId);
  const liked = !!myReaction;

  async function toggleHeart() {
    if (busy) return;
    setBusy(true);
    if (myReaction) {
      await supabase.from("reactions").delete().eq("id", myReaction.id);
    } else {
      await supabase
        .from("reactions")
        .insert({ post_id: post.id, user_id: userId, emoji: "❤️" });
    }
    setBusy(false);
    onChange();
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    await supabase
      .from("comments")
      .insert({ post_id: post.id, author_id: userId, content: commentText.trim() });
    setCommentText("");
    onChange();
  }

  const typeBadge =
    post.type === "recipe"
      ? { icon: UtensilsCrossed, label: "Recipe" }
      : post.type === "story"
        ? { icon: BookOpen, label: "Story" }
        : null;

  return (
    <article className="rounded-2xl border border-line bg-paper p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar
          name={post.author?.display_name ?? "Someone"}
          url={post.author?.avatar_url}
        />
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            {post.author?.display_name ?? "Someone"}
          </p>
          <p className="text-xs text-muted">{timeAgo(post.created_at)}</p>
        </div>
        {typeBadge && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-sage-light px-3 py-1 text-xs font-medium text-sage-dark">
            <typeBadge.icon className="h-3.5 w-3.5" />
            {typeBadge.label}
          </span>
        )}
      </div>

      {post.content && (
        <p className="mt-3 whitespace-pre-wrap text-ink">{post.content}</p>
      )}

      {post.media.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {post.media.map((m) =>
            m.media_type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.media_url}
                alt={m.caption ?? ""}
                className="w-full rounded-xl object-cover"
              />
            ) : (
              <a
                key={m.id}
                href={m.media_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-xl bg-cream p-6 text-sm text-sage-dark"
              >
                View attachment
              </a>
            ),
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-5 border-t border-line pt-3 text-sm">
        <button
          onClick={toggleHeart}
          className={`flex items-center gap-1.5 transition ${
            liked ? "text-terracotta" : "text-muted hover:text-terracotta"
          }`}
        >
          <Heart
            className="h-5 w-5"
            fill={liked ? "currentColor" : "none"}
          />
          {post.reactions.length > 0 && <span>{post.reactions.length}</span>}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-muted transition hover:text-sage-dark"
        >
          <MessageCircle className="h-5 w-5" />
          {post.comments.length > 0 && <span>{post.comments.length}</span>}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 flex flex-col gap-3">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar
                name={c.author?.display_name ?? "Someone"}
                url={c.author?.avatar_url}
                size={28}
              />
              <div className="rounded-2xl bg-cream px-3 py-2">
                <p className="text-xs font-semibold text-ink">
                  {c.author?.display_name ?? "Someone"}
                </p>
                <p className="text-sm text-ink">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={addComment} className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a kind word…"
              className={`${inputClass} py-2`}
            />
            <button
              type="submit"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage text-white"
              aria-label="Send comment"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

function Composer({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const { family, userId } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!content.trim() && !file) return;
    setBusy(true);
    setError(null);
    try {
      const { data: post, error: postErr } = await supabase
        .from("posts")
        .insert({
          family_id: family.id,
          author_id: userId,
          content: content.trim() || null,
          type: file ? "photo" : "post",
          status: "published",
        })
        .select()
        .single();
      if (postErr || !post) throw postErr;

      if (file) {
        const { url, type } = await uploadToMedia(supabase, file, userId);
        await supabase.from("post_media").insert({
          post_id: post.id,
          media_url: url,
          media_type: type,
        });
      }
      onPosted();
    } catch {
      setError("Something went sideways — want to try again?");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
      <div className="w-full max-w-lg rounded-t-3xl bg-paper p-5 shadow-lift sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg text-ink">Share with the family</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted">
            <X className="h-6 w-6" />
          </button>
        </div>
        <textarea
          autoFocus
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's been happening?"
          className={`${inputClass} resize-none`}
        />
        {file && (
          <p className="mt-2 truncate text-sm text-sage-dark">
            📎 {file.name}
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-terracotta-dark">{error}</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sage-dark"
          >
            <ImagePlus className="h-5 w-5" />
            Photo
          </button>
          <button
            onClick={submit}
            disabled={busy || (!content.trim() && !file)}
            className={`${btnPrimary} ml-auto`}
          >
            {busy ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
