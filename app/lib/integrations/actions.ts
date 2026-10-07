"use server";

import { refreshSitePublic } from "@/app/lib/cache-tags";
import { writeAudit } from "@/app/lib/security/audit";
import { openIntegrationSecret, sealIntegrationSecret } from "@/app/lib/security/integration-secret";
import { getAccountProfile } from "@/app/lib/auth/session";
import type { MessageKey } from "@/app/lib/messages";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { INTEGRATION_KEYS, type IntegrationKey } from "@/app/lib/site-admin/types";
import { parseUmamiShareUrl } from "@/app/lib/umami-share";

const DEFAULT_UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";

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

function isKey(value: string): value is IntegrationKey {
  return (INTEGRATION_KEYS as readonly string[]).includes(value);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUmamiScript(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cloud.umami.is";
  } catch {
    return false;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveIntegration(
  key: string,
  input: { clientId: string; secret: string; replyTo: string },
): Promise<ActionResult> {
  if (!isKey(key)) return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };

  const { data: current } = await gate.client
    .from("site_integrations")
    .select("client_id, client_secret, configured_account_email")
    .eq("integration_key", key)
    .maybeSingle();

  const clientId = input.clientId.trim();
  const typedSecret = input.secret.trim();
  const secret = typedSecret || openIntegrationSecret(current?.client_secret);
  const replyTo = input.replyTo.trim();

  if (key === "turnstile") {
    if (!clientId) return { ok: false, error: "integrations.turnstile.error.site_key" };
    if (!secret) return { ok: false, error: "integrations.turnstile.error.secret" };
  }
  if (key === "google_oauth") {
    if (!clientId) return { ok: false, error: "integrations.google_oauth.error.client_id" };
    if (!secret) return { ok: false, error: "integrations.google_oauth.error.client_secret" };
  }
  if (key === "resend") {
    if (!isEmail(clientId)) return { ok: false, error: "integrations.resend.error.from" };
    if (!isEmail(replyTo)) return { ok: false, error: "integrations.resend.error.reply_to" };
    if (!secret) return { ok: false, error: "integrations.resend.error.api_key" };
  }
  let umamiShare = "";
  if (key === "umami") {
    if (!clientId) return { ok: false, error: "integrations.umami.error.website_id" };
    if (replyTo) {
      const share = parseUmamiShareUrl(replyTo);
      if (!share) return { ok: false, error: "integrations.umami.error.share" };
      umamiShare = share.url;
    }
  }
  if (key === "sentry") {
    if (!isHttpsUrl(secret)) return { ok: false, error: "integrations.sentry.error.dsn" };
  }

  const storedSecret = key === "umami" ? secret || DEFAULT_UMAMI_SCRIPT_URL : secret;
  if (key === "umami" && !isUmamiScript(storedSecret)) return { ok: false, error: "integrations.umami.error.script" };

  const { error } = await gate.client.from("site_integrations").upsert(
    {
      integration_key: key,
      client_id: clientId,
      client_secret: sealIntegrationSecret(storedSecret),
      configured_account_email: key === "resend" ? replyTo : umamiShare,
      is_configured: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "integration_key" },
  );
  if (error) return { ok: false, error: "auth.error.generic" };
  await writeAudit("integration.save", "site_integrations", key);
  refresh();
  return { ok: true };
}

export async function setIntegrationEnabled(key: string, enabled: boolean): Promise<ActionResult> {
  if (!isKey(key)) return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { data } = await gate.client.from("site_integrations").select("is_configured").eq("integration_key", key).maybeSingle();
  if (!data?.is_configured) return { ok: false, error: "integrations.error.not_configured" };
  const { error } = await gate.client
    .from("site_integrations")
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("integration_key", key);
  if (error) return { ok: false, error: "auth.error.generic" };
  await writeAudit("integration.enabled", "site_integrations", key, { enabled });
  refresh();
  return { ok: true };
}

export async function resetIntegration(key: string): Promise<ActionResult> {
  if (!isKey(key)) return { ok: false, error: "auth.error.generic" };
  const gate = await adminClient();
  if (!gate.client) return { ok: false, error: gate.error ?? "admin.error.forbidden" };
  const { error } = await gate.client
    .from("site_integrations")
    .update({
      client_id: "",
      client_secret: "",
      configured_account_email: "",
      is_configured: false,
      is_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("integration_key", key);
  if (error) return { ok: false, error: "auth.error.generic" };
  await writeAudit("integration.reset", "site_integrations", key);
  refresh();
  return { ok: true };
}
