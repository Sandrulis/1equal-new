import { cache } from "react";
import { messages } from "@/app/lib/messages";
import { DEFAULT_SITE_NAME } from "@/app/lib/site-brand";
import { getSiteUrl } from "@/app/lib/site";
import { INTEGRATION_KEYS, type AdminConsole, type IntegrationKey, type IntegrationStatus, type PublicI18n, type PublicUmami, type SiteBrand, type SiteLanguage, type SiteTranslationRow, type SystemSubteam, type SystemTeam, type SystemUser } from "@/app/lib/site-admin/types";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

const FALLBACK_LANGUAGES: SiteLanguage[] = [
  { code: "lv", name: "Latviešu", isActive: true, isDefault: true, sortOrder: 0 },
  { code: "en", name: "English", isActive: true, isDefault: false, sortOrder: 1 },
];

function publicAssetUrl(path: string | null): string | null {
  if (!path) return null;
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return `${env.url}/storage/v1/object/public/branding/${path}`;
}

function mapLanguage(row: {
  code: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}): SiteLanguage {
  return {
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
  };
}

export const getSiteBrand = cache(async (): Promise<SiteBrand> => {
  const admin = createAdminClient();
  if (!admin) return { name: DEFAULT_SITE_NAME, logoUrl: null, faviconUrl: null };
  const { data } = await admin.from("site_settings").select("name, logo_path, favicon_path").eq("id", 1).maybeSingle();
  return {
    name: data?.name?.trim() || DEFAULT_SITE_NAME,
    logoUrl: publicAssetUrl(data?.logo_path ?? null),
    faviconUrl: publicAssetUrl(data?.favicon_path ?? null),
  };
});

export const listSiteLanguages = cache(async (): Promise<SiteLanguage[]> => {
  const admin = createAdminClient();
  if (!admin) return FALLBACK_LANGUAGES;
  const { data, error } = await admin.from("site_languages").select("code, name, is_active, is_default, sort_order").order("sort_order").order("code");
  if (error || !data?.length) return FALLBACK_LANGUAGES;
  return data.map(mapLanguage);
});

export const getPublicI18n = cache(async (): Promise<PublicI18n> => {
  const languages = await listSiteLanguages();
  const active = languages.filter((language) => language.isActive);
  const usable = active.length > 0 ? active : FALLBACK_LANGUAGES;
  const defaultCode = usable.find((language) => language.isDefault)?.code ?? usable[0]?.code ?? "lv";
  const admin = createAdminClient();
  const overrides: Record<string, Record<string, string>> = {};
  if (admin) {
    const { data } = await admin.from("site_translations").select("translation_key, language_code, value");
    for (const row of data ?? []) {
      const bucket = overrides[row.translation_key] ?? {};
      bucket[row.language_code] = row.value;
      overrides[row.translation_key] = bucket;
    }
  }
  return {
    languages: usable.map((language) => ({ code: language.code, name: language.name, isDefault: language.code === defaultCode })),
    defaultCode,
    overrides,
  };
});

function displayName(row: { name: string; first_name: string; last_name: string; email: string }): string {
  const parts = [row.first_name, row.last_name].map((part) => part.trim()).filter(Boolean);
  if (parts.length) return parts.join(" ");
  return row.name.trim() || row.email;
}

export async function listSystemUsers(): Promise<SystemUser[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("users").select("id, email, name, first_name, last_name, is_admin, created_at");
  if (error || !data) return [];
  return data
    .map((row) => ({
      id: row.id,
      name: displayName(row),
      email: row.email,
      isAdmin: row.is_admin,
      createdAt: row.created_at,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "lv"));
}

export async function listSystemTeams(): Promise<SystemTeam[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("teams").select("id, name, updated_at").order("name");
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, name: row.name, updatedAt: row.updated_at }));
}

export async function listSystemSubteams(): Promise<SystemSubteam[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("subteams").select("id, team_id, name, color, updated_at, teams(name)").order("name");
  if (error || !data) return [];
  return data.map((row) => {
    const team = row.teams as { name: string } | { name: string }[] | null;
    const teamName = Array.isArray(team) ? team[0]?.name ?? "" : team?.name ?? "";
    return {
      id: row.id,
      teamId: row.team_id,
      teamName,
      name: row.name,
      color: row.color,
      updatedAt: row.updated_at,
    };
  });
}

function emptyIntegration(key: IntegrationKey): IntegrationStatus {
  return { key, clientId: "", replyTo: "", hasSecret: false, configured: false, enabled: false };
}

export async function listIntegrations(): Promise<IntegrationStatus[]> {
  const admin = createAdminClient();
  const byKey = new Map<IntegrationKey, IntegrationStatus>(INTEGRATION_KEYS.map((key) => [key, emptyIntegration(key)]));
  if (!admin) return INTEGRATION_KEYS.map((key) => byKey.get(key)!);
  const { data, error } = await admin
    .from("site_integrations")
    .select("integration_key, client_id, client_secret, configured_account_email, is_configured, is_enabled");
  if (error || !data) return INTEGRATION_KEYS.map((key) => byKey.get(key)!);
  for (const row of data) {
    if (!INTEGRATION_KEYS.includes(row.integration_key as IntegrationKey)) continue;
    const key = row.integration_key as IntegrationKey;
    byKey.set(key, {
      key,
      clientId: row.client_id ?? "",
      replyTo: key === "resend" ? (row.configured_account_email ?? "") : "",
      hasSecret: Boolean(row.client_secret?.trim()),
      configured: row.is_configured,
      enabled: row.is_enabled,
    });
  }
  return INTEGRATION_KEYS.map((key) => byKey.get(key)!);
}

export async function getPublicUmami(): Promise<PublicUmami | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("site_integrations")
    .select("client_id, client_secret, is_configured, is_enabled")
    .eq("integration_key", "umami")
    .maybeSingle();
  if (!data?.is_configured || !data.is_enabled) return null;
  const websiteId = data.client_id?.trim() ?? "";
  const scriptUrl = data.client_secret?.trim() ?? "";
  if (!websiteId || !scriptUrl.startsWith("https://")) return null;
  return { websiteId, scriptUrl };
}

export async function loadAdminConsole(): Promise<AdminConsole> {
  const [brand, languages] = await Promise.all([getSiteBrand(), listSiteLanguages()]);
  const admin = createAdminClient();
  const stored = new Map<string, Record<string, string>>();
  if (admin) {
    const { data } = await admin.from("site_translations").select("translation_key, language_code, value");
    for (const row of data ?? []) {
      const bucket = stored.get(row.translation_key) ?? {};
      bucket[row.language_code] = row.value;
      stored.set(row.translation_key, bucket);
    }
  }

  const keys = new Set<string>([...Object.keys(messages), ...stored.keys()]);
  const translations: SiteTranslationRow[] = [...keys].sort().map((key) => {
    const bundled = key in messages;
    const builtIn = bundled ? messages[key as keyof typeof messages] : null;
    const values: Record<string, string> = {};
    for (const language of languages) {
      const saved = stored.get(key)?.[language.code];
      if (saved !== undefined) {
        values[language.code] = saved;
        continue;
      }
      if (builtIn && (language.code === "lv" || language.code === "en")) values[language.code] = builtIn[language.code];
      else values[language.code] = "";
    }
    return { key, bundled, values };
  });

  const [users, teams, subteams, integrations] = await Promise.all([
    listSystemUsers(),
    listSystemTeams(),
    listSystemSubteams(),
    listIntegrations(),
  ]);
  return { brand, languages, translations, users, teams, subteams, integrations, googleRedirectUrl: `${getSiteUrl()}/auth/callback` };
}
