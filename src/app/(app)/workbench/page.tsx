"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookHeart,
  UtensilsCrossed,
  ScrollText,
  PenLine,
  ChevronLeft,
  ImagePlus,
  Sprout,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { uploadToMedia, UploadError } from "@/lib/upload";
import { btnPrimary, btnSecondary, card, inputClass } from "@/lib/styles";
import type { GardenItem, PostType } from "@/lib/types";

type Template = "memory" | "recipe" | "story" | "free";

const TEMPLATES: {
  key: Template;
  title: string;
  blurb: string;
  icon: typeof BookHeart;
  postType: PostType;
}[] = [
  {
    key: "memory",
    title: "Memory",
    blurb: "A moment worth keeping, with photos.",
    icon: BookHeart,
    postType: "story",
  },
  {
    key: "recipe",
    title: "Recipe",
    blurb: "Pass down a family favorite.",
    icon: UtensilsCrossed,
    postType: "recipe",
  },
  {
    key: "story",
    title: "Story",
    blurb: "A longer tale with a cover photo.",
    icon: ScrollText,
    postType: "story",
  },
  {
    key: "free",
    title: "Free Post",
    blurb: "Just words and pictures, your way.",
    icon: PenLine,
    postType: "post",
  },
];

export default function WorkbenchPage() {
  const [template, setTemplate] = useState<Template | null>(null);

  if (template) {
    return (
      <Editor
        template={TEMPLATES.find((t) => t.key === template)!}
        onBack={() => setTemplate(null)}
      />
    );
  }

  return (
    <div>
      <header className="px-5 pt-8 pb-2">
        <h1 className="text-3xl text-ink">The Workbench</h1>
        <p className="mt-1 text-muted">Craft something to share with your family.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 p-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTemplate(t.key)}
            className={`${card} flex flex-col items-start gap-3 p-4 text-left transition hover:shadow-lift`}
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-sage-light text-sage-dark">
              <t.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-ink">{t.title}</p>
              <p className="text-sm text-muted">{t.blurb}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type PickedMedia =
  | { kind: "file"; file: File; preview: string }
  | { kind: "garden"; url: string };

function Editor({
  template,
  onBack,
}: {
  template: (typeof TEMPLATES)[number];
  onBack: () => void;
}) {
  const router = useRouter();
  const { family, userId } = useApp();
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isRecipe = template.key === "recipe";

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((file) => ({
      kind: "file" as const,
      file,
      preview: URL.createObjectURL(file),
    }));
    setMedia((m) => [...m, ...next]);
  }

  function composeContent(): string {
    if (isRecipe) {
      const parts: string[] = [];
      if (title.trim()) parts.push(title.trim());
      if (ingredients.trim()) parts.push(`Ingredients:\n${ingredients.trim()}`);
      if (instructions.trim())
        parts.push(`Instructions:\n${instructions.trim()}`);
      return parts.join("\n\n");
    }
    const parts: string[] = [];
    if (template.key !== "free" && title.trim()) parts.push(title.trim());
    if (body.trim()) parts.push(body.trim());
    return parts.join("\n\n");
  }

  async function save(status: "published" | "draft") {
    const content = composeContent();
    if (!content && media.length === 0) {
      setError("Add a little something before you publish.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: post, error: postErr } = await supabase
        .from("posts")
        .insert({
          family_id: family.id,
          author_id: userId,
          content: content || null,
          type: template.postType,
          status,
        })
        .select()
        .single();
      if (postErr || !post) throw postErr;

      for (const m of media) {
        let url: string;
        let mediaType: "image" | "video" | "document" = "image";
        if (m.kind === "file") {
          const uploaded = await uploadToMedia(supabase, m.file, userId);
          url = uploaded.url;
          mediaType = uploaded.type;
        } else {
          url = m.url;
        }
        await supabase.from("post_media").insert({
          post_id: post.id,
          media_url: url,
          media_type: mediaType,
        });
      }

      if (status === "published") {
        router.push("/home");
        router.refresh();
      } else {
        onBack();
      }
    } catch (e) {
      setError(
        e instanceof UploadError
          ? e.message
          : "Something went sideways — want to try again?",
      );
      setBusy(false);
    }
  }

  return (
    <div className="pb-6">
      <header className="flex items-center gap-2 px-3 pt-6 pb-2">
        <button onClick={onBack} className="rounded-full p-2 text-muted" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl text-ink">{template.title}</h1>
      </header>

      <div className="flex flex-col gap-3 px-4">
        {template.key !== "free" && (
          <input
            placeholder={isRecipe ? "Recipe name" : "Give it a title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputClass} text-lg`}
          />
        )}

        {isRecipe ? (
          <>
            <textarea
              rows={4}
              placeholder="Ingredients (one per line)"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className={`${inputClass} resize-none`}
            />
            <textarea
              rows={5}
              placeholder="Instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </>
        ) : (
          <textarea
            rows={template.key === "story" ? 10 : 6}
            placeholder={
              template.key === "free"
                ? "What's on your mind?"
                : "Tell the story…"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        )}

        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-xl bg-cream"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.kind === "file" ? m.preview : m.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/60 text-white"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className={`${btnSecondary} flex-1`}
          >
            <ImagePlus className="h-5 w-5" /> Upload
          </button>
          <button
            onClick={() => setPickerOpen(true)}
            className={`${btnSecondary} flex-1`}
          >
            <Sprout className="h-5 w-5" /> From Garden
          </button>
        </div>

        {error && <p className="text-sm text-terracotta-dark">{error}</p>}

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => save("draft")}
            disabled={busy}
            className={`${btnSecondary} flex-1`}
          >
            Save draft
          </button>
          <button
            onClick={() => save("published")}
            disabled={busy}
            className={`${btnPrimary} flex-1`}
          >
            {busy ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <GardenPicker
          familyId={family.id}
          onClose={() => setPickerOpen(false)}
          onPick={(url) => {
            setMedia((m) => [...m, { kind: "garden", url }]);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function GardenPicker({
  familyId,
  onClose,
  onPick,
}: {
  familyId: string;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<GardenItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("garden_items")
        .select("*")
        .eq("family_id", familyId)
        .eq("media_type", "image")
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [supabase, familyId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
      <div className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-lift sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg text-ink">Pick from the Garden</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted">
            <X className="h-6 w-6" />
          </button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No photos in the Garden yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onPick(item.media_url)}
                className="aspect-square overflow-hidden rounded-xl bg-cream"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.media_url}
                  alt={item.title ?? ""}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
