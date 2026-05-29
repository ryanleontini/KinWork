"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Upload,
  X,
  FileText,
  Film,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { EmptyState, Spinner } from "@/components/ui";
import { uploadToMedia, UploadError } from "@/lib/upload";
import { timeAgo } from "@/lib/format";
import { btnPrimary, inputClass } from "@/lib/styles";
import type { GardenItem, MediaType } from "@/lib/types";

type Filter = "all" | "image" | "video" | "document";
type MemberInfo = { display_name: string };

export default function GardenPage() {
  const { family, userId } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<GardenItem[]>([]);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [folder, setFolder] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GardenItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: mems } = await supabase
      .from("family_members")
      .select("user_id, display_name")
      .eq("family_id", family.id);
    const map: Record<string, MemberInfo> = {};
    (mems ?? []).forEach((m) => (map[m.user_id] = { display_name: m.display_name }));
    setMembers(map);

    const { data } = await supabase
      .from("garden_items")
      .select("*")
      .eq("family_id", family.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [supabase, family.id]);

  useEffect(() => {
    load();
  }, [load]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.folder && set.add(i.folder));
    return Array.from(set).sort();
  }, [items]);

  const filtered = items.filter((i) => {
    if (filter !== "all" && i.media_type !== filter) return false;
    if (folder !== "All" && i.folder !== folder) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${i.title ?? ""} ${i.description ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-3xl text-ink">The Garden</h1>
        <p className="mt-1 text-muted">Every photo and keepsake, growing together.</p>
      </header>

      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description"
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {(["all", "image", "video", "document"] as Filter[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "image" ? "Photos" : f === "video" ? "Videos" : "Documents"}
          </Chip>
        ))}
      </div>

      {folders.length > 0 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
          <Chip active={folder === "All"} onClick={() => setFolder("All")} tone="folder">
            All folders
          </Chip>
          {folders.map((f) => (
            <Chip key={f} active={folder === f} onClick={() => setFolder(f)} tone="folder">
              {f}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4 px-4">
        {loading ? (
          <Spinner label="Opening the garden…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Your garden is waiting for its first memory"
            body="Upload a photo, a recipe card, or a scanned letter to get started."
          />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-cream"
              >
                {item.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.media_url}
                    alt={item.title ?? ""}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-sage-dark">
                    {item.media_type === "video" ? (
                      <Film className="h-7 w-7" />
                    ) : (
                      <FileText className="h-7 w-7" />
                    )}
                    <span className="px-1 text-center text-[10px] leading-tight">
                      {item.title ?? "File"}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setUploadOpen(true)}
        aria-label="Upload to garden"
        className="fixed bottom-24 right-1/2 z-30 translate-x-[calc(min(50vw,16rem)-1.5rem)] grid h-14 w-14 place-items-center rounded-full bg-terracotta text-white shadow-lift transition hover:bg-terracotta-dark active:scale-95"
      >
        <Upload className="h-6 w-6" />
      </button>

      {selected && (
        <DetailModal
          item={selected}
          uploader={members[selected.uploaded_by]?.display_name ?? "Someone"}
          onClose={() => setSelected(null)}
        />
      )}

      {uploadOpen && (
        <UploadModal
          familyId={family.id}
          userId={userId}
          existingFolders={folders}
          onClose={() => setUploadOpen(false)}
          onDone={() => {
            setUploadOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  tone = "type",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "type" | "folder";
}) {
  const activeClass =
    tone === "folder"
      ? "bg-terracotta text-white"
      : "bg-sage text-white";
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? activeClass : "border border-line bg-paper text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function DetailModal({
  item,
  uploader,
  onClose,
}: {
  item: GardenItem;
  uploader: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-paper p-4 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg text-ink">{item.title ?? "Keepsake"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted">
            <X className="h-6 w-6" />
          </button>
        </div>
        {item.media_type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.media_url}
            alt={item.title ?? ""}
            className="w-full rounded-2xl object-contain"
          />
        ) : (
          <a
            href={item.media_url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-2 rounded-2xl bg-cream p-10 text-sage-dark"
          >
            {item.media_type === "video" ? (
              <Film className="h-10 w-10" />
            ) : (
              <FileText className="h-10 w-10" />
            )}
            <span className="text-sm">Open file</span>
          </a>
        )}
        {item.description && (
          <p className="mt-3 text-ink">{item.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {item.folder && (
            <span className="rounded-full bg-terracotta-light px-2.5 py-1 text-terracotta-dark">
              {item.folder}
            </span>
          )}
          <span>
            Added by {uploader} · {timeAgo(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function UploadModal({
  familyId,
  userId,
  existingFolders,
  onClose,
  onDone,
}: {
  familyId: string;
  userId: string;
  existingFolders: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const { url, type } = await uploadToMedia(supabase, file, userId);
        const rows: {
          family_id: string;
          uploaded_by: string;
          title: string | null;
          description: string | null;
          media_url: string;
          media_type: MediaType;
          folder: string | null;
        } = {
          family_id: familyId,
          uploaded_by: userId,
          title: title.trim() || file.name,
          description: description.trim() || null,
          media_url: url,
          media_type: type,
          folder: folder.trim() || null,
        };
        await supabase.from("garden_items").insert(rows);
      }
      onDone();
    } catch (e) {
      setError(
        e instanceof UploadError
          ? e.message
          : "Something went sideways while uploading — want to try again?",
      );
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
      <div className="w-full max-w-lg rounded-t-3xl bg-paper p-5 shadow-lift sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg text-ink">Add to the garden</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted">
            <X className="h-6 w-6" />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          hidden
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-sage-dark"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm">
            {files.length > 0
              ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
              : "Choose photos or files"}
          </span>
        </button>

        <div className="mt-3 flex flex-col gap-3">
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
          <textarea
            rows={2}
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-none`}
          />
          <input
            list="garden-folders"
            placeholder="Folder (e.g. Lake House Trip '98)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className={inputClass}
          />
          <datalist id="garden-folders">
            {existingFolders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          {error && <p className="text-sm text-terracotta-dark">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || files.length === 0}
            className={btnPrimary}
          >
            {busy ? "Planting…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
