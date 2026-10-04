import { headers } from "next/headers";
import { cache } from "react";
import { isIP } from "node:net";
import { trustedClientAddress } from "@/app/lib/security/client-ip";
import { createAdminClient } from "@/app/lib/supabase/admin";

type OriginSnapshot = { ip: string; countryCode: string };

function isPublicIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 6) {
    const value = ip.toLowerCase();
    if (value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return false;
    return true;
  }
  if (kind !== 4) return false;
  const parts = ip.split(".").map((part) => Number(part));
  const [first, second] = parts;
  if (first === 10 || first === 127 || first === 0) return false;
  if (first === 192 && second === 168) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  return true;
}

export type RequestAddress = { ip: string; countryCode: string; publicIp: boolean };

export async function captureRequestAddress(): Promise<RequestAddress> {
  const address = trustedClientAddress(await headers());
  return { ip: address.ip, countryCode: address.countryCode, publicIp: Boolean(address.ip) && isPublicIp(address.ip) };
}

function publicSnapshot(address: RequestAddress): OriginSnapshot {
  if (!address.publicIp) return { ip: "", countryCode: "" };
  return { ip: address.ip, countryCode: address.countryCode };
}

export async function readRequestOrigin(): Promise<OriginSnapshot> {
  return publicSnapshot(await captureRequestAddress());
}

async function lookupCountry(ip: string): Promise<string> {
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return "";
    const payload = (await response.json()) as { success?: boolean; country_code?: string };
    const code = payload.country_code?.trim().toUpperCase() ?? "";
    if (!payload.success || !/^[A-Z]{2}$/.test(code)) return "";
    return code;
  } catch {
    return "";
  }
}

async function resolvedOrigin(snapshot: OriginSnapshot): Promise<OriginSnapshot> {
  if (!snapshot.ip || snapshot.countryCode) return snapshot;
  return { ip: snapshot.ip, countryCode: await lookupCountry(snapshot.ip) };
}

const loadOriginTable = cache(async (): Promise<Map<string, { ip: string; countryCode: string }>> => {
  const map = new Map<string, { ip: string; countryCode: string }>();
  const admin = createAdminClient();
  if (!admin) return map;
  const { data, error } = await admin.from("user_origins").select("user_id, ip, country_code");
  if (error || !data) return map;
  for (const row of data) map.set(row.user_id, { ip: row.ip ?? "", countryCode: row.country_code ?? "" });
  return map;
});

export async function listUserOrigins(userIds: string[]): Promise<Map<string, { ip: string; countryCode: string }>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, { ip: string; countryCode: string }>();
  if (ids.length === 0) return map;
  const all = await loadOriginTable();
  for (const id of ids) {
    const row = all.get(id);
    if (row) map.set(id, row);
  }
  return map;
}

export async function recordUserOrigin(userId: string, captured?: RequestAddress): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const address = captured ?? (await captureRequestAddress());
  if (!address.ip) return;
  const snapshot = { ip: address.ip, countryCode: address.publicIp ? address.countryCode : "" };
  const existing = await admin.from("user_origins").select("ip, country_code").eq("user_id", userId).maybeSingle();
  const sameIp = existing.data?.ip === snapshot.ip;
  if (sameIp && (existing.data?.country_code || !snapshot.countryCode)) return;
  let countryCode = snapshot.countryCode;
  if (!countryCode && !sameIp && address.publicIp) countryCode = await lookupCountry(snapshot.ip);
  if (!countryCode && sameIp) countryCode = existing.data?.country_code ?? "";
  await admin.from("user_origins").upsert({ user_id: userId, ip: snapshot.ip, country_code: countryCode, updated_at: new Date().toISOString() });
}

export async function recordTeamOrigin(teamId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const origin = await resolvedOrigin(await readRequestOrigin());
  if (!origin.ip) return;
  await admin.from("team_origins").upsert({ team_id: teamId, ip: origin.ip, country_code: origin.countryCode, updated_at: new Date().toISOString() });
}

export async function recordMissingTeamOrigins(teamIds: string[], captured?: RequestAddress): Promise<void> {
  const admin = createAdminClient();
  if (!admin || teamIds.length === 0) return;
  const existing = await admin.from("team_origins").select("team_id").in("team_id", teamIds);
  if (existing.error) return;
  const known = new Set((existing.data ?? []).map((row) => row.team_id as string));
  const missing = teamIds.filter((id) => !known.has(id));
  if (missing.length === 0) return;
  const origin = await resolvedOrigin(captured ? publicSnapshot(captured) : await readRequestOrigin());
  if (!origin.ip) return;
  const now = new Date().toISOString();
  await admin.from("team_origins").insert(missing.map((team_id) => ({ team_id, ip: origin.ip, country_code: origin.countryCode, updated_at: now })));
}
