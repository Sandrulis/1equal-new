"use server";

import { revalidatePath } from "next/cache";
import { getAccountProfile } from "@/app/lib/auth/session";
import { BUILTIN_NAV_KEYS, MODULE_KEY_PATTERN, normalizeModuleKey, type FrontendModule } from "@/app/lib/frontend-modules";
import { messages, type MessageKey } from "@/app/lib/messages";
import { createAdminClient } from "@/app/lib/supabase/admin";

const MAX_BYTES = 1_572_864;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

type ActionResult = { ok: true } | { ok: false; error: MessageKey };

function refresh() {
  revalidatePath("/", "layout");
}

async function adminClient() {
  const account = await getAccountProfile();
  if (!account?.isAdmin) return { error: "admin.error.forbidden" as const, client: null };
  const client = createAdminClient();
  if (!client) return { error: "auth.error.config" as const, client: null };
  return { error: null, client };
}

function extension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  if (file.type === "image/svg+xml") return "svg";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type.includes("icon")) return "ico";
  return "png";
}

async function storeImage(file: File, prefix: string): Promise<{ path: string } | { error: MessageKey }> {
  if (!ALLOWED_TYPES.has(file.type)) return { error: "site_settings.error.file" };
  if (file.size > MAX_BYTES) return { error: "site_settings.error.file" };
  const gate = await adminClient();
  if (!gate.client) return { error: gate.error ?? "admin.error.forbidden" };
  const path = `${prefix}-${Date.now()}.${extension(file)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await gate.client.storage.from("branding").upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: "auth.error.generic" };
  return { path };
}

async function removeStored(path: string | null) {
  if (!path) return;
  const client = createAdminClient();
  if (!client) return;
  await client.storage.from("branding").remove([path]);
}

export async function saveSiteSettings(formData: FormData): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 80) return { ok: false, error: "site_settings.error.name" };

  const { data: current } = await gate.client.from("site_settings").select("logo_path, favicon_path").eq("id", 1).maybeSingle();
  let logoPath = current?.logo_path ?? null;
  let faviconPath = current?.favicon_path ?? null;

  const logo = formData.get("logo");
  const favicon = formData.get("favicon");
  const removeLogo = formData.get("removeLogo") === "1";
  const removeFavicon = formData.get("removeFavicon") === "1";

  if (logo instanceof File && logo.size > 0) {
    const stored = await storeImage(logo, "logo");
    if ("error" in stored) return { ok: false, error: stored.error };
    await removeStored(logoPath);
    logoPath = stored.path;
  } else if (removeLogo) {
    await removeStored(logoPath);
    logoPath = null;
  }

  if (favicon instanceof File && favicon.size > 0) {
    const stored = await storeImage(favicon, "favicon");
    if ("error" in stored) return { ok: false, error: stored.error };
    await removeStored(faviconPath);
    faviconPath = stored.path;
  } else if (removeFavicon) {
    await removeStored(faviconPath);
    faviconPath = null;
  }

  const { error } = await gate.client.from("site_settings").upsert({
    id: 1,
    name,
    logo_path: logoPath,
    favicon_path: faviconPath,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function createSiteLanguage(code: string, name: string, makeDefault: boolean): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const cleanCode = code.trim().toLowerCase();
  const cleanName = name.trim();
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(cleanCode) || !cleanName) return { ok: false, error: "site_languages.error.invalid" };

  const { data: existing } = await gate.client.from("site_languages").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sortOrder = (existing?.[0]?.sort_order ?? 0) + 1;
  if (makeDefault) {
    const cleared = await gate.client.from("site_languages").update({ is_default: false }).neq("code", cleanCode);
    if (cleared.error) return { ok: false, error: "auth.error.generic" };
  }
  const { error } = await gate.client.from("site_languages").insert({
    code: cleanCode,
    name: cleanName,
    is_active: true,
    is_default: makeDefault,
    sort_order: sortOrder,
  });
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function updateSiteLanguageName(code: string, name: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: "site_languages.error.invalid" };
  const { error } = await gate.client.from("site_languages").update({ name: cleanName }).eq("code", code);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function updateSiteLanguageActive(code: string, isActive: boolean): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  if (!isActive) {
    const { data } = await gate.client.from("site_languages").select("is_default").eq("code", code).maybeSingle();
    if (data?.is_default) return { ok: false, error: "site_languages.error.default_active" };
  }
  const { error } = await gate.client.from("site_languages").update({ is_active: isActive }).eq("code", code);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function setDefaultSiteLanguage(code: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const cleared = await gate.client.from("site_languages").update({ is_default: false }).neq("code", code);
  if (cleared.error) return { ok: false, error: "auth.error.generic" };
  const { error } = await gate.client.from("site_languages").update({ is_default: true, is_active: true }).eq("code", code);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function deleteSiteLanguage(code: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { data } = await gate.client.from("site_languages").select("is_default").eq("code", code).maybeSingle();
  if (data?.is_default) return { ok: false, error: "site_languages.error.default_delete" };
  const { error } = await gate.client.from("site_languages").delete().eq("code", code);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function saveSiteTranslation(input: {
  key: string;
  previousKey: string | null;
  values: Record<string, string>;
}): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const key = input.key.trim();
  if (!/^[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/.test(key)) return { ok: false, error: "site_translations.error.key" };
  const bundled = key in messages;
  const previous = input.previousKey?.trim() || null;
  if (previous && previous !== key) {
    if (previous in messages) return { ok: false, error: "site_translations.error.bundled" };
    await gate.client.from("site_translations").delete().eq("translation_key", previous);
  }
  if (!previous && (await gate.client.from("site_translations").select("translation_key").eq("translation_key", key).limit(1)).data?.length && !(key in messages)) {
    return { ok: false, error: "site_translations.error.exists" };
  }

  const rows = Object.entries(input.values)
    .map(([languageCode, value]) => ({ languageCode, value: value.trim() }))
    .filter((row) => row.value !== "" || !bundled);

  if (!bundled && rows.every((row) => row.value === "")) return { ok: false, error: "site_translations.error.key" };

  if (bundled) {
    const empty = Object.entries(input.values).filter(([, value]) => value.trim() === "").map(([languageCode]) => languageCode);
    if (empty.length) await gate.client.from("site_translations").delete().eq("translation_key", key).in("language_code", empty);
  }

  const filled = rows.filter((row) => row.value !== "");
  if (filled.length) {
    const { error } = await gate.client.from("site_translations").upsert(
      filled.map((row) => ({ translation_key: key, language_code: row.languageCode, value: row.value })),
      { onConflict: "translation_key,language_code" },
    );
    if (error) return { ok: false, error: "auth.error.generic" };
  }
  refresh();
  return { ok: true };
}

const NAME_MAX = 80;

function cleanName(value: string): string | null {
  const name = value.trim();
  if (!name || name.length > NAME_MAX) return null;
  return name;
}

export async function saveTeam(input: { id: string | null; name: string }): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "admin.error.name" };
  const updated_at = new Date().toISOString();
  if (input.id) {
    const { error } = await gate.client.from("teams").update({ name, updated_at }).eq("id", input.id);
    if (error) return { ok: false, error: "auth.error.generic" };
  } else {
    const { error } = await gate.client.from("teams").insert({ name, updated_at });
    if (error) return { ok: false, error: "auth.error.generic" };
  }
  refresh();
  return { ok: true };
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client.from("teams").delete().eq("id", id);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function saveSubteam(input: { id: string | null; teamId: string; name: string; color: string }): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const name = cleanName(input.name);
  if (!name || !input.teamId) return { ok: false, error: input.teamId ? "admin.error.name" : "admin.subteams.need_team" };
  const color = /^#[0-9A-Fa-f]{6}$/.test(input.color) ? input.color : "#0f6e82";
  const updated_at = new Date().toISOString();
  const row = { team_id: input.teamId, name, color, updated_at };
  if (input.id) {
    const { error } = await gate.client.from("subteams").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "auth.error.generic" };
  } else {
    const { error } = await gate.client.from("subteams").insert(row);
    if (error) return { ok: false, error: "auth.error.generic" };
  }
  refresh();
  return { ok: true };
}

export async function deleteSubteam(id: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client.from("subteams").delete().eq("id", id);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

type ModuleRow = { id: string; module_key: string; is_enabled: boolean; sort_order: number };

function mapModule(row: ModuleRow): FrontendModule {
  return { id: row.id, moduleKey: row.module_key, isEnabled: row.is_enabled, sortOrder: row.sort_order };
}

export async function createFrontendModule(rawKey: string): Promise<{ ok: true; module: FrontendModule } | { ok: false; error: MessageKey }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const moduleKey = normalizeModuleKey(rawKey);
  if (!moduleKey) return { ok: false, error: "frontend_modules.error.key_required" };
  if (moduleKey.length > 128 || !MODULE_KEY_PATTERN.test(moduleKey)) return { ok: false, error: "frontend_modules.error.key_invalid" };
  if ((BUILTIN_NAV_KEYS as readonly string[]).includes(moduleKey)) return { ok: false, error: "frontend_modules.error.builtin" };
  const existing = await gate.client.from("site_frontend_modules").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sortOrder = ((existing.data?.[0]?.sort_order as number | undefined) ?? 0) + 10;
  const now = new Date().toISOString();
  const inserted = await gate.client
    .from("site_frontend_modules")
    .insert({ module_key: moduleKey, is_enabled: false, sort_order: sortOrder, updated_at: now })
    .select("id, module_key, is_enabled, sort_order")
    .single();
  if (inserted.error || !inserted.data) {
    return { ok: false, error: inserted.error?.code === "23505" ? "frontend_modules.error.exists" : "auth.error.generic" };
  }
  refresh();
  return { ok: true, module: mapModule(inserted.data as ModuleRow) };
}

export async function setFrontendModuleEnabled(moduleKey: string, isEnabled: boolean): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client
    .from("site_frontend_modules")
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq("module_key", moduleKey);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function deleteFrontendModule(moduleKey: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client.from("site_frontend_modules").delete().eq("module_key", moduleKey);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

export async function deleteSiteTranslation(key: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  if (key in messages) return { ok: false, error: "site_translations.error.bundled" };
  const { error } = await gate.client.from("site_translations").delete().eq("translation_key", key);
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}
