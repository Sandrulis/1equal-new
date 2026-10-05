"use server";

import { writeAudit } from "@/app/lib/security/audit";
import { removeAvatar } from "@/app/lib/avatar-storage";
import { refreshSitePublic } from "@/app/lib/cache-tags";
import { getAccountProfile } from "@/app/lib/auth/session";
import { BUILTIN_NAV_KEYS, MODULE_KEY_PATTERN, normalizeModuleKey, type FrontendModule } from "@/app/lib/frontend-modules";
import { messages, type MessageKey } from "@/app/lib/messages";
import { listAdminFeedback, listAdminTodos, listSports } from "@/app/lib/site-admin/repository";
import { resolveSportIcon } from "@/app/lib/fa-icons";
import { cleanPositionCode, memberUsesCode } from "@/app/lib/positions";
import type { Sport } from "@/app/lib/sports";
import { EMAIL_KINDS, type AdminFeedbackItem, type AdminTodo, type EmailKind, type EmailTemplate } from "@/app/lib/site-admin/types";
import { isTimeZone, normalizeDateFormat, normalizeDateSeparator, normalizeTimeFormat, normalizeWeekStartDay } from "@/app/lib/display-preferences";
import { isCurrency, votingHours } from "@/app/lib/team-defaults";
import { readFinanceCron, writeFinanceCron } from "@/app/lib/finance-cron";
import { createAdminClient } from "@/app/lib/supabase/admin";

const MAX_BYTES = 1_572_864;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

type ActionResult = { ok: true } | { ok: false; error: MessageKey };

function refresh() {
  refreshSitePublic();
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

export async function setSiteMaintenance(enabled: boolean): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client.from("site_settings").update({ maintenance: enabled, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { ok: false, error: "auth.error.generic" };
  await writeAudit("site_settings.maintenance", "site_settings", "1");
  refresh();
  return { ok: true };
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

  const currency = String(formData.get("currency") ?? "");
  const trainingVotingHours = votingHours(formData.get("trainingVotingHours"));
  const gameVotingHours = votingHours(formData.get("gameVotingHours"));
  if (!isCurrency(currency) || trainingVotingHours == null || gameVotingHours == null) return { ok: false, error: "site_settings.error.team_defaults" };

  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { ok: false, error: "site_settings.error.contact_email" };

  const weekStartDay = String(formData.get("weekStartDay") ?? "");
  const dateFormat = String(formData.get("dateFormat") ?? "");
  const dateSeparator = String(formData.get("dateSeparator") ?? "");
  const timeFormat = String(formData.get("timeFormat") ?? "");
  const timeZone = String(formData.get("timezone") ?? "").trim();
  const displayOk =
    normalizeWeekStartDay(weekStartDay) === weekStartDay &&
    normalizeDateFormat(dateFormat) === dateFormat &&
    normalizeDateSeparator(dateSeparator) === dateSeparator &&
    normalizeTimeFormat(timeFormat) === timeFormat &&
    isTimeZone(timeZone);
  if (!displayOk) return { ok: false, error: "site_settings.error.display" };

  const { data: languageRows, error: languageError } = await gate.client.from("site_languages").select("code");
  if (languageError) return { ok: false, error: "auth.error.generic" };
  const sloganUpdates: { code: string; slogan: string }[] = [];
  for (const row of languageRows ?? []) {
    const raw = formData.get(`slogan:${row.code}`);
    if (raw == null) continue;
    const slogan = String(raw).trim();
    if (slogan.length > 200) return { ok: false, error: "site_settings.error.slogan" };
    sloganUpdates.push({ code: row.code, slogan });
  }

  const { error } = await gate.client.from("site_settings").upsert({
    id: 1,
    name,
    logo_path: logoPath,
    favicon_path: faviconPath,
    week_start_day: weekStartDay,
    date_format: dateFormat,
    date_separator: dateSeparator,
    time_format: timeFormat,
    timezone: timeZone,
    currency,
    training_voting_hours: trainingVotingHours,
    game_voting_hours: gameVotingHours,
    contact_email: contactEmail,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "auth.error.generic" };
  for (const item of sloganUpdates) {
    const updated = await gate.client.from("site_languages").update({ slogan: item.slogan }).eq("code", item.code);
    if (updated.error) return { ok: false, error: "auth.error.generic" };
  }
  await writeAudit("site_settings.save", "site_settings", "1");
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

export async function setAdminTeamWatch(teamId: string, watch: boolean): Promise<ActionResult> {
  const account = await getAccountProfile();
  if (!account?.isAdmin) return { ok: false, error: "admin.error.forbidden" };
  const client = createAdminClient();
  if (!client) return { ok: false, error: "auth.error.config" };
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return { ok: false, error: "auth.error.generic" };
  const team = await client.from("teams").select("id").eq("id", teamId).maybeSingle();
  if (team.error || !team.data) return { ok: false, error: "auth.error.generic" };
  if (watch) {
    const saved = await client.from("admin_team_watches").upsert({ user_id: account.id, team_id: teamId }, { onConflict: "user_id,team_id" });
    if (saved.error) return { ok: false, error: "auth.error.generic" };
    const active = await client.from("users").update({ active_team_id: teamId }).eq("id", account.id);
    if (active.error) return { ok: false, error: "auth.error.generic" };
  } else {
    const removed = await client.from("admin_team_watches").delete().eq("user_id", account.id).eq("team_id", teamId);
    if (removed.error) return { ok: false, error: "auth.error.generic" };
  }
  refresh();
  await writeAudit(watch ? "team.watch" : "team.unwatch", "teams", teamId);
  return { ok: true };
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client.from("teams").delete().eq("id", id);
  if (error) return { ok: false, error: "auth.error.generic" };
  await writeAudit("team.delete", "teams", id);
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

type ModuleRow = { id: string; module_key: string; is_enabled: boolean; is_individual: boolean; sort_order: number };

function mapModule(row: ModuleRow): FrontendModule {
  return { id: row.id, moduleKey: row.module_key, isEnabled: row.is_enabled, isIndividual: row.is_individual === true, sortOrder: row.sort_order };
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
    .select("id, module_key, is_enabled, is_individual, sort_order")
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

export async function setFrontendModuleIndividual(moduleKey: string, isIndividual: boolean): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client
    .from("site_frontend_modules")
    .update({ is_individual: isIndividual, updated_at: new Date().toISOString() })
    .eq("module_key", moduleKey);
  if (error) return { ok: false, error: "auth.error.generic" };
  if (isIndividual) {
    const cleared = await gate.client.from("team_modules").delete().eq("module_key", moduleKey);
    if (cleared.error) return { ok: false, error: "auth.error.generic" };
  }
  refresh();
  return { ok: true };
}

export async function setTeamModule(teamId: string, moduleKey: string, enabled: boolean): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return { ok: false, error: "auth.error.generic" };
  const found = await gate.client.from("site_frontend_modules").select("is_individual").eq("module_key", moduleKey).maybeSingle();
  if (found.error || found.data?.is_individual !== true) return { ok: false, error: "auth.error.generic" };
  const saved = enabled
    ? await gate.client.from("team_modules").upsert({ team_id: teamId, module_key: moduleKey }, { onConflict: "team_id,module_key" })
    : await gate.client.from("team_modules").delete().eq("team_id", teamId).eq("module_key", moduleKey);
  if (saved.error) return { ok: false, error: "auth.error.generic" };
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

function isEmailKind(value: string): value is EmailKind {
  return EMAIL_KINDS.some((kind) => kind === value);
}

export async function saveEmailTemplates(templates: EmailTemplate[]): Promise<ActionResult> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { data: languages } = await gate.client.from("site_languages").select("code");
  const codes = new Set((languages ?? []).map((row) => row.code));
  const rows = templates.flatMap((template) => {
    if (!isEmailKind(template.kind)) return [];
    const languageCodes = new Set([...Object.keys(template.subjects), ...Object.keys(template.bodies), ...Object.keys(template.buttons)]);
    return [...languageCodes].flatMap((code) => {
      if (!codes.has(code)) return [];
      return [{
        kind: template.kind,
        language_code: code,
        subject: (template.subjects[code] ?? "").slice(0, 200),
        body: (template.bodies[code] ?? "").slice(0, 4000),
        button_label: (template.buttons[code] ?? "").slice(0, 80),
      }];
    });
  });
  if (rows.length === 0) return { ok: false, error: "auth.error.generic" };
  const { error } = await gate.client.from("email_templates").upsert(rows, { onConflict: "kind,language_code" });
  if (error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

async function todosForAdmin(): Promise<{ ok: true; todos: AdminTodo[] } | { ok: false; error: MessageKey }> {
  const account = await getAccountProfile();
  if (!account?.isAdmin) return { ok: false, error: "admin.error.forbidden" };
  return { ok: true, todos: await listAdminTodos(account.id) };
}

export async function addAdminTodo(title: string): Promise<{ ok: true; todos: AdminTodo[] } | { ok: false; error: MessageKey }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const account = await getAccountProfile();
  if (!account) return { ok: false, error: "admin.error.forbidden" };
  const trimmed = title.trim().slice(0, 500);
  if (!trimmed) return { ok: false, error: "admin.todo.error.empty" };
  const existing = await gate.client.from("user_todos").select("sort_order").eq("user_id", account.id).eq("is_done", false).order("sort_order", { ascending: false }).limit(1);
  const sortOrder = Number(existing.data?.[0]?.sort_order ?? 0) + 1;
  const { error } = await gate.client.from("user_todos").insert({ user_id: account.id, title: trimmed, sort_order: sortOrder });
  if (error) return { ok: false, error: "admin.todo.error.save" };
  return todosForAdmin();
}

export async function setAdminTodoDone(id: string, done: boolean): Promise<{ ok: true; todos: AdminTodo[] } | { ok: false; error: MessageKey }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const account = await getAccountProfile();
  if (!account) return { ok: false, error: "admin.error.forbidden" };
  const { error } = await gate.client
    .from("user_todos")
    .update({ is_done: done, completed_at: done ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", account.id);
  if (error) return { ok: false, error: "admin.todo.error.save" };
  return todosForAdmin();
}

export async function reorderAdminTodos(ids: string[]): Promise<{ ok: true; todos: AdminTodo[] } | { ok: false; error: MessageKey; todos?: AdminTodo[] }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const account = await getAccountProfile();
  if (!account) return { ok: false, error: "admin.error.forbidden" };
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) return { ok: false, error: "admin.todo.error.save" };
  const ordered = [...new Set(ids)];
  const existing = await gate.client.from("user_todos").select("id").eq("user_id", account.id).eq("is_done", false);
  if (existing.error) return { ok: false, error: "admin.todo.error.save" };
  const openIds = new Set((existing.data ?? []).map((row) => row.id));
  if (ordered.length !== openIds.size || ordered.some((id) => !openIds.has(id))) return { ok: false, error: "admin.todo.error.save" };
  const updatedAt = new Date().toISOString();
  for (let index = 0; index < ordered.length; index += 1) {
    const saved = await gate.client.from("user_todos").update({ sort_order: index, updated_at: updatedAt }).eq("id", ordered[index]).eq("user_id", account.id).eq("is_done", false);
    if (saved.error) {
      const current = await todosForAdmin();
      return current.ok ? { ok: false, error: "admin.todo.error.save", todos: current.todos } : { ok: false, error: "admin.todo.error.save" };
    }
  }
  return todosForAdmin();
}

export async function deleteAdminFeedback(id: string): Promise<{ ok: true; items: AdminFeedbackItem[] } | { ok: false; error: MessageKey }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, error: "admin.feedback.error.delete" };
  }
  const { error } = await gate.client.from("site_user_feedback").delete().eq("id", id);
  if (error) return { ok: false, error: "admin.feedback.error.delete" };
  return { ok: true, items: await listAdminFeedback() };
}

export async function deleteAdminTodo(id: string): Promise<{ ok: true; todos: AdminTodo[] } | { ok: false; error: MessageKey }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const account = await getAccountProfile();
  if (!account) return { ok: false, error: "admin.error.forbidden" };
  const { error } = await gate.client.from("user_todos").delete().eq("id", id).eq("user_id", account.id);
  if (error) return { ok: false, error: "admin.todo.error.save" };
  return todosForAdmin();
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

export async function loadFinanceCron(): Promise<{ ok: true; enabled: boolean; url: string } | { ok: false; error: MessageKey }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const settings = await readFinanceCron(gate.client);
  if (!settings) return { ok: false, error: "auth.error.generic" };
  return { ok: true, enabled: settings.enabled, url: settings.url };
}

export async function saveFinanceCron(enabled: boolean): Promise<ActionResult> {
  if (typeof enabled !== "boolean") return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const saved = await writeFinanceCron(gate.client, enabled);
  if (!saved) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true };
}

function sportWriteError(error: { message?: string; code?: string } | null): MessageKey {
  if (error?.message?.includes("sports_need_one") || error?.code === "P0001") return "sports.error.last";
  if (error?.code === "23503") return "sports.error.used";
  return "auth.error.generic";
}

async function sportPayload(
  client: NonNullable<Awaited<ReturnType<typeof adminClient>>["client"]>,
  input: { names: Record<string, string>; icon: string; moduleKeys: string[] },
): Promise<{ ok: true; names: Record<string, string>; icon: Sport["icon"]; moduleKeys: string[] } | { ok: false; error: MessageKey }> {
  const icon = await resolveSportIcon(input.icon);
  if (!icon) return { ok: false, error: "sports.error.icon" };
  const languages = await client.from("site_languages").select("code, is_active");
  if (languages.error || !languages.data) return { ok: false, error: "auth.error.generic" };
  const names: Record<string, string> = {};
  for (const language of languages.data as { code: string; is_active: boolean }[]) {
    const value = (input.names[language.code] ?? "").trim().slice(0, 80);
    if (language.is_active && !value) return { ok: false, error: "sports.error.name" };
    if (value) names[language.code] = value;
  }
  if (Object.keys(names).length === 0) return { ok: false, error: "sports.error.name" };
  const modules = await client.from("site_frontend_modules").select("module_key");
  if (modules.error || !modules.data) return { ok: false, error: "auth.error.generic" };
  const known = new Set((modules.data as { module_key: string }[]).map((row) => row.module_key));
  const moduleKeys = [...new Set(input.moduleKeys.map((key) => key.trim()))].filter((key) => known.has(key));
  return { ok: true, names, icon, moduleKeys };
}

async function replaceSportLinks(
  client: NonNullable<Awaited<ReturnType<typeof adminClient>>["client"]>,
  sportId: string,
  names: Record<string, string>,
  moduleKeys: string[],
): Promise<MessageKey | null> {
  const clearedNames = await client.from("sport_names").delete().eq("sport_id", sportId);
  if (clearedNames.error) return "auth.error.generic";
  const savedNames = await client.from("sport_names").insert(Object.entries(names).map(([language_code, name]) => ({ sport_id: sportId, language_code, name })));
  if (savedNames.error) return "auth.error.generic";
  const clearedModules = await client.from("sport_modules").delete().eq("sport_id", sportId);
  if (clearedModules.error) return "auth.error.generic";
  if (moduleKeys.length === 0) return null;
  const savedModules = await client.from("sport_modules").insert(moduleKeys.map((module_key) => ({ sport_id: sportId, module_key })));
  return savedModules.error ? "auth.error.generic" : null;
}

export async function createSport(input: {
  names: Record<string, string>;
  icon: string;
  moduleKeys: string[];
  isActive: boolean;
}): Promise<{ ok: true; sports: Sport[] } | { ok: false; error: MessageKey }> {
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const payload = await sportPayload(gate.client, input);
  if (!payload.ok) return payload;
  const existing = await gate.client.from("sports").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sortOrder = (existing.data?.[0]?.sort_order ?? 0) + 1;
  const inserted = await gate.client.from("sports").insert({ icon: payload.icon, is_active: input.isActive !== false, sort_order: sortOrder }).select("id").single();
  if (inserted.error || !inserted.data) return { ok: false, error: sportWriteError(inserted.error) };
  const linked = await replaceSportLinks(gate.client, inserted.data.id, payload.names, payload.moduleKeys);
  if (linked) return { ok: false, error: linked };
  refresh();
  return { ok: true, sports: await listSports() };
}

export async function updateSport(input: {
  id: string;
  names: Record<string, string>;
  icon: string;
  moduleKeys: string[];
  isActive: boolean;
}): Promise<{ ok: true; sports: Sport[] } | { ok: false; error: MessageKey }> {
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const payload = await sportPayload(gate.client, input);
  if (!payload.ok) return payload;
  if (input.isActive === false) {
    const active = await gate.client.from("sports").select("id").eq("is_active", true);
    const ids = (active.data ?? []).map((row) => row.id as string);
    if (ids.length <= 1 && ids.includes(input.id)) return { ok: false, error: "sports.error.last" };
  }
  const saved = await gate.client.from("sports").update({ icon: payload.icon, is_active: input.isActive === true, updated_at: new Date().toISOString() }).eq("id", input.id);
  if (saved.error) return { ok: false, error: sportWriteError(saved.error) };
  const linked = await replaceSportLinks(gate.client, input.id, payload.names, payload.moduleKeys);
  if (linked) return { ok: false, error: linked };
  refresh();
  return { ok: true, sports: await listSports() };
}

export async function setSportActive(id: string, isActive: boolean): Promise<{ ok: true; sports: Sport[] } | { ok: false; error: MessageKey }> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || typeof isActive !== "boolean") return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  if (!isActive) {
    const active = await gate.client.from("sports").select("id").eq("is_active", true);
    const ids = (active.data ?? []).map((row) => row.id as string);
    if (ids.length <= 1 && ids.includes(id)) return { ok: false, error: "sports.error.last" };
  }
  const saved = await gate.client.from("sports").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (saved.error) return { ok: false, error: sportWriteError(saved.error) };
  refresh();
  return { ok: true, sports: await listSports() };
}

export async function deleteSport(id: string): Promise<{ ok: true; sports: Sport[] } | { ok: false; error: MessageKey }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const active = await gate.client.from("sports").select("id, is_active").eq("id", id).maybeSingle();
  if (active.error || !active.data) return { ok: false, error: "auth.error.generic" };
  if (active.data.is_active) {
    const others = await gate.client.from("sports").select("id").eq("is_active", true).neq("id", id);
    if ((others.data ?? []).length === 0) return { ok: false, error: "sports.error.last" };
  }
  const used = await gate.client.from("teams").select("id", { count: "exact", head: true }).eq("sport_id", id);
  if (used.error) return { ok: false, error: "auth.error.generic" };
  if ((used.count ?? 0) > 0) return { ok: false, error: "sports.error.used" };
  const removed = await gate.client.from("sports").delete().eq("id", id);
  if (removed.error) return { ok: false, error: sportWriteError(removed.error) };
  refresh();
  return { ok: true, sports: await listSports() };
}

async function positionNames(
  client: NonNullable<Awaited<ReturnType<typeof adminClient>>["client"]>,
  input: Record<string, string>,
): Promise<{ ok: true; names: Record<string, string> } | { ok: false; error: MessageKey }> {
  const languages = await client.from("site_languages").select("code, is_active");
  if (languages.error || !languages.data) return { ok: false, error: "auth.error.generic" };
  const names: Record<string, string> = {};
  for (const language of languages.data as { code: string; is_active: boolean }[]) {
    const value = (input[language.code] ?? "").trim().slice(0, 80);
    if (language.is_active && !value) return { ok: false, error: "sports.error.name" };
    if (value) names[language.code] = value;
  }
  if (Object.keys(names).length === 0) return { ok: false, error: "sports.error.name" };
  return { ok: true, names };
}

async function replacePositionNames(
  client: NonNullable<Awaited<ReturnType<typeof adminClient>>["client"]>,
  positionId: string,
  names: Record<string, string>,
): Promise<MessageKey | null> {
  const cleared = await client.from("sport_position_names").delete().eq("position_id", positionId);
  if (cleared.error) return "auth.error.generic";
  const saved = await client.from("sport_position_names").insert(Object.entries(names).map(([language_code, name]) => ({ position_id: positionId, language_code, name })));
  return saved.error ? "auth.error.generic" : null;
}

async function teamsForSport(client: NonNullable<Awaited<ReturnType<typeof adminClient>>["client"]>, sportId: string): Promise<string[] | null> {
  const teams = await client.from("teams").select("id").eq("sport_id", sportId);
  if (teams.error) return null;
  return (teams.data ?? []).map((row) => row.id as string);
}

async function renameMemberPosition(
  client: NonNullable<Awaited<ReturnType<typeof adminClient>>["client"]>,
  sportId: string,
  from: string,
  to: string,
): Promise<MessageKey | null> {
  if (from === to) return null;
  const teamIds = await teamsForSport(client, sportId);
  if (!teamIds) return "auth.error.generic";
  if (teamIds.length === 0) return null;
  const members = await client.from("team_members").select("team_id, user_id, position, extra_positions").in("team_id", teamIds);
  if (members.error) return "auth.error.generic";
  const now = new Date().toISOString();
  for (const row of members.data ?? []) {
    const current = cleanPositionCode(row.position) || "";
    const extras = String(row.extra_positions ?? "")
      .split(",")
      .map((part) => cleanPositionCode(part))
      .filter(Boolean)
      .map((part) => (part === from ? to : part));
    const position = current === from ? to : current;
    const extraPositions = [...new Set(extras.filter((part) => part !== position))].join(",");
    if (position === (row.position ?? "") && extraPositions === (row.extra_positions ?? "")) continue;
    const saved = await client.from("team_members").update({ position, extra_positions: extraPositions, updated_at: now }).eq("team_id", row.team_id).eq("user_id", row.user_id);
    if (saved.error) return "auth.error.generic";
  }
  return null;
}

function positionWriteError(error: { code?: string } | null): MessageKey {
  if (error?.code === "23505") return "sports.positions.error.exists";
  return "auth.error.generic";
}

export async function saveSportPosition(input: {
  sportId: string;
  id?: string | null;
  code: string;
  names: Record<string, string>;
}): Promise<{ ok: true; sports: Sport[] } | { ok: false; error: MessageKey }> {
  if (!/^[0-9a-f-]{36}$/i.test(input.sportId)) return { ok: false, error: "auth.error.generic" };
  const code = cleanPositionCode(input.code);
  if (!code) return { ok: false, error: "sports.positions.error.code" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const sport = await gate.client.from("sports").select("id").eq("id", input.sportId).maybeSingle();
  if (sport.error || !sport.data) return { ok: false, error: "auth.error.generic" };
  const names = await positionNames(gate.client, input.names);
  if (!names.ok) return names;
  const positionId = (input.id ?? "").trim();
  if (positionId) {
    if (!/^[0-9a-f-]{36}$/i.test(positionId)) return { ok: false, error: "auth.error.generic" };
    const existing = await gate.client.from("sport_positions").select("id, code").eq("id", positionId).eq("sport_id", input.sportId).maybeSingle();
    if (existing.error || !existing.data) return { ok: false, error: "auth.error.generic" };
    const saved = await gate.client.from("sport_positions").update({ code, updated_at: new Date().toISOString() }).eq("id", positionId);
    if (saved.error) return { ok: false, error: positionWriteError(saved.error) };
    const linked = await replacePositionNames(gate.client, positionId, names.names);
    if (linked) return { ok: false, error: linked };
    const renamed = await renameMemberPosition(gate.client, input.sportId, existing.data.code, code);
    if (renamed) return { ok: false, error: renamed };
  } else {
    const last = await gate.client.from("sport_positions").select("sort_order").eq("sport_id", input.sportId).order("sort_order", { ascending: false }).limit(1);
    if (last.error) return { ok: false, error: "auth.error.generic" };
    const sortOrder = ((last.data?.[0]?.sort_order as number | undefined) ?? -1) + 1;
    const inserted = await gate.client.from("sport_positions").insert({ sport_id: input.sportId, code, sort_order: sortOrder }).select("id").single();
    if (inserted.error || !inserted.data) return { ok: false, error: positionWriteError(inserted.error) };
    const linked = await replacePositionNames(gate.client, inserted.data.id, names.names);
    if (linked) return { ok: false, error: linked };
  }
  refresh();
  return { ok: true, sports: await listSports() };
}

export async function deleteSportPosition(sportId: string, id: string): Promise<{ ok: true; sports: Sport[] } | { ok: false; error: MessageKey }> {
  if (!/^[0-9a-f-]{36}$/i.test(sportId) || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const existing = await gate.client.from("sport_positions").select("id, code").eq("id", id).eq("sport_id", sportId).maybeSingle();
  if (existing.error || !existing.data) return { ok: false, error: "auth.error.generic" };
  const code = existing.data.code;
  const teamIds = await teamsForSport(gate.client, sportId);
  if (!teamIds) return { ok: false, error: "auth.error.generic" };
  if (teamIds.length) {
    const members = await gate.client.from("team_members").select("position, extra_positions").in("team_id", teamIds);
    if (members.error) return { ok: false, error: "auth.error.generic" };
    const used = (members.data ?? []).some((row) => memberUsesCode(row.position ?? "", row.extra_positions ?? "", code));
    if (used) return { ok: false, error: "sports.positions.error.used" };
  }
  const removed = await gate.client.from("sport_positions").delete().eq("id", id);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  refresh();
  return { ok: true, sports: await listSports() };
}

export async function reorderSportPositions(sportId: string, ids: string[]): Promise<{ ok: true; sports: Sport[] } | { ok: false; error: MessageKey; sports?: Sport[] }> {
  if (!/^[0-9a-f-]{36}$/i.test(sportId) || !Array.isArray(ids) || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const ordered = [...new Set(ids)];
  const rows = await gate.client.from("sport_positions").select("id").eq("sport_id", sportId);
  if (rows.error || !rows.data) return { ok: false, error: "auth.error.generic" };
  const existing = new Set(rows.data.map((row) => row.id as string));
  if (ordered.length !== existing.size || ordered.some((id) => !existing.has(id))) return { ok: false, error: "auth.error.generic" };
  const now = new Date().toISOString();
  for (let place = 0; place < ordered.length; place += 1) {
    const saved = await gate.client.from("sport_positions").update({ sort_order: place, updated_at: now }).eq("id", ordered[place]).eq("sport_id", sportId);
    if (saved.error) return { ok: false, error: "auth.error.generic", sports: await listSports() };
  }
  refresh();
  return { ok: true, sports: await listSports() };
}

export async function deleteSystemUser(userId: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: "auth.error.generic" };
  const account = await getAccountProfile();
  if (!account?.isAdmin) return { ok: false, error: "admin.error.forbidden" };
  if (userId === account.id) return { ok: false, error: "admin.users.delete.self" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };

  const target = await gate.client.from("users").select("id, is_admin").eq("id", userId).maybeSingle();
  if (target.error || !target.data) return { ok: false, error: "auth.error.generic" };
  if (target.data.is_admin === true) {
    const admins = await gate.client.from("users").select("id", { count: "exact", head: true }).eq("is_admin", true);
    if (admins.error) return { ok: false, error: "auth.error.generic" };
    if ((admins.count ?? 0) <= 1) return { ok: false, error: "user.delete.last_admin" };
  }

  const released = await gate.client.rpc("release_user_for_deletion", { target: userId });
  if (released.error) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.auth.admin.deleteUser(userId);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  await removeAvatar(`users/${userId}.jpg`);
  await writeAudit("users.delete", "users", userId);
  return { ok: true };
}
