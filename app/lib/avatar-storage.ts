import type { MessageKey } from "@/app/lib/messages";
import { rateLimit } from "@/app/lib/security/rate-limit";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

const MAX_BYTES = 700_000;

export function avatarPublicUrl(path: string): string | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return `${env.url}/storage/v1/object/public/avatars/${path}?v=${Date.now()}`;
}

export function ownAvatarUrl(value: string | null, path: string): string | null {
  if (!value) return null;
  const env = getSupabasePublicEnv();
  if (!env) return null;
  try {
    const url = new URL(value);
    const base = new URL(env.url);
    if (url.origin !== base.origin) return null;
    if (url.pathname !== `/storage/v1/object/public/avatars/${path}`) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function uploadAvatarJpeg(file: File, path: string, limitKey: string): Promise<{ url: string } | { error: MessageKey }> {
  if (await rateLimit(`avatar:${limitKey}`, 20, 10 * 60 * 1000)) return { error: "feedback.error.rate" };
  if (file.size <= 0 || file.size > MAX_BYTES) return { error: "avatar.error.file" };
  if (file.type !== "image/jpeg" && file.type !== "image/jpg") return { error: "avatar.error.file" };
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return { error: "avatar.error.file" };
  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };
  const { error } = await admin.storage.from("avatars").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) return { error: "avatar.error.save" };
  const url = avatarPublicUrl(path);
  if (!url) return { error: "auth.error.config" };
  return { url };
}

export async function removeAvatar(path: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.storage.from("avatars").remove([path]);
}
