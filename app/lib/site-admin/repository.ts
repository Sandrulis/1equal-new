import { unstable_cache } from "next/cache";
import { normalizeSiteDisplay } from "@/app/lib/display-preferences";
import { DEFAULT_GAME_VOTING_HOURS, DEFAULT_TRAINING_VOTING_HOURS, normalizeCurrency, votingHours } from "@/app/lib/team-defaults";
import { messages } from "@/app/lib/messages";
import { DEFAULT_SITE_NAME } from "@/app/lib/site-brand";
import { getSiteUrl } from "@/app/lib/site";
import { readStoredEhlPlayer } from "@/app/lib/ehl-player";
import { displayPosition } from "@/app/lib/positions";
import { BUILTIN_NAV_KEYS, KNOWN_FRONTEND_MODULE_KEYS, type FrontendModule } from "@/app/lib/frontend-modules";
import { EMAIL_KINDS, INTEGRATION_KEYS, type AdminConsole, type AdminTodo, type EmailKind, type EmailTemplate, type IntegrationKey, type IntegrationStatus, type PublicI18n, type PublicSentry, type PublicUmami, type SiteBrand, type SiteLanguage, type SiteTranslationRow, type SystemSubteam, type SystemTeam, type SystemTeamMember, type SystemUser } from "@/app/lib/site-admin/types";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { isSportIcon, type Sport, type SportIcon } from "@/app/lib/sports";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

function cachedPublic<T>(key: string, load: () => Promise<T>) {
  return unstable_cache(load, [key], { revalidate: 60, tags: ["site-public"] });
}

const FALLBACK_LANGUAGES: SiteLanguage[] = [
  { code: "lv", name: "Latviešu", isActive: true, isDefault: true, sortOrder: 0 },
  { code: "en", name: "English", isActive: true, isDefault: false, sortOrder: 1 },
  { code: "ru", name: "Русский", isActive: true, isDefault: false, sortOrder: 2 },
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

export const getSiteBrand = cachedPublic("site-brand", async (): Promise<SiteBrand> => {
  const admin = createAdminClient();
  if (!admin) return { name: DEFAULT_SITE_NAME, logoUrl: null, faviconUrl: null, display: normalizeSiteDisplay(null), currency: normalizeCurrency(null), trainingVotingHours: DEFAULT_TRAINING_VOTING_HOURS, gameVotingHours: DEFAULT_GAME_VOTING_HOURS, contactEmail: "" };
  const { data } = await admin.from("site_settings").select("name, logo_path, favicon_path, week_start_day, date_format, date_separator, time_format, timezone, currency, training_voting_hours, game_voting_hours, contact_email").eq("id", 1).maybeSingle();
  return {
    name: data?.name?.trim() || DEFAULT_SITE_NAME,
    logoUrl: publicAssetUrl(data?.logo_path ?? null),
    faviconUrl: publicAssetUrl(data?.favicon_path ?? null),
    display: normalizeSiteDisplay({
      weekStartDay: data?.week_start_day,
      dateFormat: data?.date_format,
      dateSeparator: data?.date_separator,
      timeFormat: data?.time_format,
      timeZone: data?.timezone,
    }),
    currency: normalizeCurrency(data?.currency),
    trainingVotingHours: votingHours(data?.training_voting_hours) ?? DEFAULT_TRAINING_VOTING_HOURS,
    gameVotingHours: votingHours(data?.game_voting_hours) ?? DEFAULT_GAME_VOTING_HOURS,
    contactEmail: data?.contact_email?.trim() ?? "",
  };
});

export const listSiteLanguages = cachedPublic("site-languages", async (): Promise<SiteLanguage[]> => {
  const admin = createAdminClient();
  if (!admin) return FALLBACK_LANGUAGES;
  const { data, error } = await admin.from("site_languages").select("code, name, is_active, is_default, sort_order").order("sort_order").order("code");
  if (error || !data?.length) return FALLBACK_LANGUAGES;
  return data.map(mapLanguage);
});

export const getPublicI18n = cachedPublic("site-i18n", async (): Promise<PublicI18n> => {
  const admin = createAdminClient();
  let usable = FALLBACK_LANGUAGES;
  if (admin) {
    const { data } = await admin.from("site_languages").select("code, name, is_active, is_default, sort_order").order("sort_order").order("code");
    const mapped = (data ?? []).map(mapLanguage).filter((language) => language.isActive);
    if (mapped.length > 0) usable = mapped;
  }
  const defaultCode = usable.find((language) => language.isDefault)?.code ?? usable[0]?.code ?? "lv";
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

type MembershipLink = {
  user_id: string;
  team_id: string;
  jersey_number: number | null;
  position: string;
  phone: string;
  ehl_player: unknown;
  users: { email: string; name: string; first_name: string; last_name: string; avatar_url?: string | null } | { email: string; name: string; first_name: string; last_name: string; avatar_url?: string | null }[] | null;
  teams: { id: string; name: string } | { id: string; name: string }[] | null;
};

function oneRow<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function listMemberships(): Promise<MembershipLink[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("team_members")
    .select("user_id, team_id, jersey_number, position, phone, ehl_player, users(email, name, first_name, last_name, avatar_url), teams(id, name)");
  if (error || !data) return [];
  return data as MembershipLink[];
}

export async function listSystemUsers(): Promise<SystemUser[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const [{ data, error }, links] = await Promise.all([
    admin.from("users").select("id, email, name, first_name, last_name, is_admin, created_at, last_seen_at"),
    listMemberships(),
  ]);
  if (error || !data) return [];
  const teamsByUser = new Map<string, { id: string; name: string }[]>();
  for (const link of links) {
    const team = oneRow(link.teams);
    if (!team) continue;
    const list = teamsByUser.get(link.user_id) ?? [];
    if (!list.some((item) => item.id === team.id)) list.push({ id: team.id, name: team.name });
    teamsByUser.set(link.user_id, list);
  }
  return data
    .map((row) => ({
      id: row.id,
      name: displayName(row),
      email: row.email,
      isAdmin: row.is_admin,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      teams: (teamsByUser.get(row.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "lv")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "lv"));
}

export async function touchUserLastSeen(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
}

export async function listSystemTeamMembers(): Promise<SystemTeamMember[]> {
  const links = await listMemberships();
  return links.flatMap((link) => {
    const user = oneRow(link.users);
    const team = oneRow(link.teams);
    if (!user || !team) return [];
    const ehl = readStoredEhlPlayer(link.ehl_player);
    return [
      {
        teamId: link.team_id,
        userId: link.user_id,
        name: displayName(user),
        ehlName: ehl?.name ?? null,
        email: user.email,
        number: link.jersey_number,
        position: displayPosition(link.position),
        ehlPosition: displayPosition(ehl?.position),
        phone: link.phone ?? "",
        photoUrl: ehl?.photoUrl ?? user.avatar_url ?? null,
        avatarUrl: user.avatar_url ?? null,
      },
    ];
  });
}

export async function listSystemTeams(): Promise<SystemTeam[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("teams").select("id, name, sport_id, updated_at").order("name");
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, name: row.name, sportId: row.sport_id, updatedAt: row.updated_at }));
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

function isUmamiScript(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cloud.umami.is";
  } catch {
    return false;
  }
}

export const getPublicUmami = cachedPublic("public-umami", async (): Promise<PublicUmami | null> => {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("site_integrations")
    .select("client_id, client_secret, is_configured, is_enabled")
    .eq("integration_key", "umami")
    .maybeSingle();
  if (!data?.is_configured || !data.is_enabled) return null;
  const websiteId = data.client_id?.trim() ?? "";
  const scriptUrl = openIntegrationSecret(data.client_secret);
  if (!websiteId || !isUmamiScript(scriptUrl)) return null;
  return { websiteId, scriptUrl };
});

export const getPublicSentry = cachedPublic("public-sentry", async (): Promise<PublicSentry | null> => {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("site_integrations")
    .select("client_id, client_secret, is_configured, is_enabled")
    .eq("integration_key", "sentry")
    .maybeSingle();
  if (!data?.is_configured || !data.is_enabled) return null;
  const dsn = openIntegrationSecret(data.client_secret);
  if (!dsn.startsWith("https://")) return null;
  return { dsn, environment: data.client_id?.trim() || "production" };
});

type ModuleRow = { id: string; module_key: string; is_enabled: boolean; is_individual: boolean; sort_order: number };

function mapModule(row: ModuleRow): FrontendModule {
  return { id: row.id, moduleKey: row.module_key, isEnabled: row.is_enabled, isIndividual: row.is_individual === true, sortOrder: row.sort_order };
}

export async function listFrontendModules(): Promise<FrontendModule[] | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("site_frontend_modules").select("id, module_key, is_enabled, is_individual, sort_order").order("sort_order").order("module_key");
  if (error || !data) return null;
  return (data as ModuleRow[]).map(mapModule).filter((module) => !(BUILTIN_NAV_KEYS as readonly string[]).includes(module.moduleKey));
}

export async function listEnabledFrontendModuleKeys(): Promise<string[]> {
  const modules = await listFrontendModules();
  if (!modules) return [...KNOWN_FRONTEND_MODULE_KEYS];
  return modules.filter((module) => module.isEnabled).map((module) => module.moduleKey);
}

export async function listIndividualFrontendModuleKeys(): Promise<string[]> {
  const modules = await listFrontendModules();
  if (!modules) return [];
  return modules.filter((module) => module.isIndividual).map((module) => module.moduleKey);
}

export async function listTeamModuleLinks(): Promise<{ teamId: string; moduleKey: string }[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("team_modules").select("team_id, module_key");
  if (error || !data) return [];
  return (data as { team_id: string; module_key: string }[]).map((row) => ({ teamId: row.team_id, moduleKey: row.module_key }));
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const admin = createAdminClient();
  const buckets = new Map<EmailKind, EmailTemplate>();
  for (const kind of EMAIL_KINDS) buckets.set(kind, { kind, subjects: {}, bodies: {}, buttons: {} });
  if (!admin) return [...buckets.values()];
  const { data } = await admin.from("email_templates").select("kind, language_code, subject, body, button_label");
  for (const row of data ?? []) {
    if (!(EMAIL_KINDS as readonly string[]).includes(row.kind)) continue;
    const template = buckets.get(row.kind as EmailKind);
    if (!template) continue;
    template.subjects[row.language_code] = row.subject ?? "";
    template.bodies[row.language_code] = row.body ?? "";
    template.buttons[row.language_code] = row.button_label ?? "";
  }
  return [...buckets.values()];
}

export async function listAdminTodos(userId: string): Promise<AdminTodo[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("user_todos").select("id, title, is_done, completed_at, created_at, sort_order").eq("user_id", userId).order("is_done").order("sort_order").order("created_at");
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    isDone: row.is_done,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
}

export async function loadAdminConsole(userId: string): Promise<AdminConsole> {
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
      if (builtIn && (language.code === "lv" || language.code === "en" || language.code === "ru")) values[language.code] = builtIn[language.code];
      else values[language.code] = "";
    }
    return { key, bundled, values };
  });

  const [users, teams, members, subteams, modules, teamModules, integrations, emailTemplates, todos, watched] = await Promise.all([
    listSystemUsers(),
    listSystemTeams(),
    listSystemTeamMembers(),
    listSystemSubteams(),
    listFrontendModules().then((modules) => modules ?? []),
    listTeamModuleLinks(),
    listIntegrations(),
    listEmailTemplates(),
    listAdminTodos(userId),
    admin
      ? admin.from("admin_team_watches").select("team_id").eq("user_id", userId)
      : Promise.resolve({ data: [] as { team_id: string }[] }),
  ]);
  const watchedTeamIds = (watched.data ?? []).map((row) => row.team_id);
  return { brand, languages, translations, users, teams, members, subteams, modules, teamModules, integrations, googleRedirectUrl: `${getSiteUrl()}/auth/callback`, emailTemplates, todos, watchedTeamIds };
}

export async function listSports(): Promise<Sport[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const [sports, names, links] = await Promise.all([
    admin.from("sports").select("id, icon, is_active, sort_order").order("sort_order").order("created_at"),
    admin.from("sport_names").select("sport_id, language_code, name"),
    admin.from("sport_modules").select("sport_id, module_key"),
  ]);
  if (sports.error || !sports.data) return [];
  const nameRows = (names.data ?? []) as { sport_id: string; language_code: string; name: string }[];
  const linkRows = (links.data ?? []) as { sport_id: string; module_key: string }[];
  return (sports.data as { id: string; icon: string; is_active: boolean; sort_order: number }[]).map((row) => {
    const sportNames: Record<string, string> = {};
    for (const name of nameRows) {
      if (name.sport_id === row.id) sportNames[name.language_code] = name.name;
    }
    const icon: SportIcon = isSportIcon(row.icon) ? row.icon : "hockey";
    return {
      id: row.id,
      icon,
      isActive: row.is_active === true,
      sortOrder: row.sort_order,
      names: sportNames,
      moduleKeys: linkRows.filter((link) => link.sport_id === row.id).map((link) => link.module_key),
    };
  });
}
