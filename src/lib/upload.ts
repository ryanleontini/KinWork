import type { SupabaseClient } from "@supabase/supabase-js";
import { mediaTypeFromFile } from "@/lib/format";
import type { MediaType } from "@/lib/types";

// Hard allowlist of mime types we accept into the public `media` bucket.
// Keeps users from uploading HTML/JS/scripts (which the storage bucket would
// otherwise happily serve back with their original content-type), and keeps
// the bucket scoped to "family memories" content.
const ALLOWED_MIME = new Set<string>([
  // images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  // videos
  "video/mp4",
  "video/quicktime",
  "video/webm",
  // documents
  "application/pdf",
]);

// 25 MB ceiling per file — Supabase free tier accepts up to 50 MB, but
// 25 keeps things snappy for non-technical family members on slow phones.
const MAX_BYTES = 25 * 1024 * 1024;

export class UploadError extends Error {}

export async function uploadToMedia(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<{ url: string; type: MediaType }> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new UploadError(
      `That file type (${file.type || "unknown"}) isn't supported. Try a photo, video, or PDF.`,
    );
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError(
      "That file is a bit too large — please pick something under 25 MB.",
    );
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl, type: mediaTypeFromFile(file) };
}
