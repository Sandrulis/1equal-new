"use server";

import { createHash, randomBytes } from "node:crypto";
import { isCalendarToken } from "@/app/lib/calendar/feed";
import { getAccountProfile } from "@/app/lib/auth/session";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import type { MessageKey } from "@/app/lib/messages";
import { listEnabledFrontendModuleKeys } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";

type TokenResult = { ok: true; token: string; stored?: boolean } | { ok: false; error: MessageKey };

async function requireCalendarUser(): Promise<{ ok: true; userId: string; client: NonNullable<ReturnType<typeof createAdminClient>> } | { ok: false; error: MessageKey }> {
  const account = await getAccountProfile();
  if (!account) return { ok: false, error: "auth.error.generic" };
  const modules = await listEnabledFrontendModuleKeys();
  if (!modules.includes(FRONTEND_MODULE_KEYS.calendar)) return { ok: false, error: "frontend_modules.disabled" };
  const client = createAdminClient();
  if (!client) return { ok: false, error: "auth.error.config" };
  return { ok: true, userId: account.id, client };
}

async function storeToken(client: NonNullable<ReturnType<typeof createAdminClient>>, userId: string): Promise<TokenResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(24).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const saved = await client.from("users").update({ calendar_token: null, calendar_token_hash: hash }).eq("id", userId).select("calendar_token_hash").maybeSingle();
    if (!saved.error && saved.data?.calendar_token_hash === hash) return { ok: true, token };
    if (saved.error?.code !== "23505") return { ok: false, error: "auth.error.generic" };
  }
  return { ok: false, error: "auth.error.generic" };
}

export async function ensureCalendarToken(): Promise<TokenResult> {
  const gate = await requireCalendarUser();
  if (!gate.ok) return gate;
  const existing = await gate.client.from("users").select("calendar_token, calendar_token_hash").eq("id", gate.userId).maybeSingle();
  const token = existing.data?.calendar_token;
  if (typeof token === "string" && isCalendarToken(token)) {
    const hash = createHash("sha256").update(token).digest("hex");
    await gate.client.from("users").update({ calendar_token_hash: hash, calendar_token: null }).eq("id", gate.userId);
    return { ok: true, token };
  }
  if (existing.data?.calendar_token_hash) return { ok: true, token: "", stored: true };
  return storeToken(gate.client, gate.userId);
}

export async function regenerateCalendarToken(): Promise<TokenResult> {
  const gate = await requireCalendarUser();
  if (!gate.ok) return gate;
  return storeToken(gate.client, gate.userId);
}
