import { headers } from "next/headers";
import { createAdminClient } from "@/app/lib/supabase/admin";

type OriginSnapshot = { ip: string; countryCode: string };

function isPublicIp(ip: string): boolean {
  const value = ip.toLowerCase();
  if (value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return false;
  if (value.includes(":")) return true;
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [first, second] = parts;
  if (first === 10 || first === 127 || first === 0) return false;
  if (first === 192 && second === 168) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  return true;
}

async function requestAddress(): Promise<{ ip: string; countryCode: string; publicIp: boolean }> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const connecting = headerStore.get("cf-connecting-ip")?.trim() ?? "";
  const ip = (connecting || forwarded || headerStore.get("x-real-ip")?.trim() || "").replace(/^::ffff:/, "").slice(0, 64);
  const headerCountry = (headerStore.get("cf-ipcountry") || headerStore.get("x-vercel-ip-country") || "").trim().toUpperCase();
  const countryCode = /^[A-Z]{2}$/.test(headerCountry) && headerCountry !== "XX" && headerCountry !== "T1" ? headerCountry : "";
  return { ip, countryCode, publicIp: Boolean(ip) && isPublicIp(ip) };
}

export async function readRequestOrigin(): Promise<OriginSnapshot> {
  const address = await requestAddress();
  if (!address.publicIp) return { ip: "", countryCode: "" };
  return { ip: address.ip, countryCode: address.countryCode };
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

export async function listUserOrigins(userIds: string[]): Promise<Map<string, { ip: string; countryCode: string }>> {
  const map = new Map<string, { ip: string; countryCode: string }>();
  const admin = createAdminClient();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!admin || ids.length === 0) return map;
  const { data, error } = await admin.from("user_origins").select("user_id, ip, country_code").in("user_id", ids);
  if (error || !data) return map;
  for (const row of data) map.set(row.user_id, { ip: row.ip ?? "", countryCode: row.country_code ?? "" });
  return map;
}

export async function recordUserOrigin(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const address = await requestAddress();
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

export async function recordMissingTeamOrigins(teamIds: string[]): Promise<void> {
  const admin = createAdminClient();
  if (!admin || teamIds.length === 0) return;
  const existing = await admin.from("team_origins").select("team_id").in("team_id", teamIds);
  if (existing.error) return;
  const known = new Set((existing.data ?? []).map((row) => row.team_id as string));
  const missing = teamIds.filter((id) => !known.has(id));
  if (missing.length === 0) return;
  const origin = await resolvedOrigin(await readRequestOrigin());
  if (!origin.ip) return;
  const now = new Date().toISOString();
  await admin.from("team_origins").insert(missing.map((team_id) => ({ team_id, ip: origin.ip, country_code: origin.countryCode, updated_at: now })));
}
