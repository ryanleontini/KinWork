import type { SupabaseClient } from "@supabase/supabase-js";
import { mediaTypeFromFile } from "@/lib/format";
import type { MediaType } from "@/lib/types";

export async function uploadToMedia(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<{ url: string; type: MediaType }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl, type: mediaTypeFromFile(file) };
}
