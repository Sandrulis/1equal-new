import { headers } from "next/headers";
import type { MessageKey } from "@/app/lib/messages";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { createAdminClient } from "@/app/lib/supabase/admin";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileConfig = { siteKey: string; secret: string };

async function readTurnstile(): Promise<TurnstileConfig | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("site_integrations")
    .select("client_id, client_secret, is_enabled, is_configured")
    .eq("integration_key", "turnstile")
    .maybeSingle();
  const siteKey = data?.client_id?.trim() ?? "";
  const secret = openIntegrationSecret(data?.client_secret);
  if (!data?.is_enabled || !data.is_configured || !siteKey || !secret) return null;
  return { siteKey, secret };
}

export async function getPublicTurnstileSiteKey(): Promise<string | null> {
  const config = await readTurnstile();
  return config?.siteKey ?? null;
}

async function clientIp(): Promise<string | undefined> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerStore.get("x-real-ip")?.trim() || undefined;
}

async function verifyToken(token: string, secret: string, remoteIp?: string): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { success?: boolean };
    return payload.success === true;
  } catch {
    return false;
  }
}

export async function requireTurnstileToken(token: string | null | undefined): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const config = await readTurnstile();
  if (!config) return { ok: true };
  const trimmed = token?.trim();
  if (!trimmed) return { ok: false, error: "auth.turnstile.required" };
  const valid = await verifyToken(trimmed, config.secret, await clientIp());
  if (!valid) return { ok: false, error: "auth.turnstile.failed" };
  return { ok: true };
}
