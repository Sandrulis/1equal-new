"use server";

import { isEhlHost, parseEhlTeamUrl, readEhlTeamKits, readEhlTeamLogo, readEhlTeamTitle } from "@/app/lib/ehl-team";

export type EhlTeamLookup =
  | { ok: true; name: string; url: string; logoUrl: string | null; homeKitUrl: string | null; awayKitUrl: string | null }
  | { ok: false; error: "invalid" | "not_found" | "failed" };

export type EhlTeamKits = { homeKitUrl: string | null; awayKitUrl: string | null };

async function readEhlTeamPage(rawUrl: string): Promise<EhlTeamLookup> {
  const url = parseEhlTeamUrl(rawUrl);
  if (!url) return { ok: false, error: "invalid" };
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { accept: "text/html" },
    });
    const finalHost = new URL(response.url).hostname;
    if (!isEhlHost(finalHost)) return { ok: false, error: "invalid" };
    if (!response.ok) return { ok: false, error: "failed" };
    const html = (await response.text()).slice(0, 200_000);
    const name = readEhlTeamTitle(html);
    if (!name) return { ok: false, error: "not_found" };
    const pageUrl = url.toString();
    return { ok: true, name, url: pageUrl, logoUrl: readEhlTeamLogo(html, pageUrl), ...readEhlTeamKits(html, pageUrl) };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function lookupEhlTeamName(rawUrl: string): Promise<EhlTeamLookup> {
  return readEhlTeamPage(rawUrl);
}

export async function fetchEhlTeamKits(rawUrl: string): Promise<EhlTeamKits | null> {
  const page = await readEhlTeamPage(rawUrl);
  if (!page.ok) return page.error === "failed" ? null : { homeKitUrl: null, awayKitUrl: null };
  return { homeKitUrl: page.homeKitUrl, awayKitUrl: page.awayKitUrl };
}
