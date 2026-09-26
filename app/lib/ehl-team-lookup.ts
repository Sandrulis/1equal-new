"use server";

import { isEhlHost, parseEhlTeamUrl, readEhlTeamLogo, readEhlTeamTitle } from "@/app/lib/ehl-team";

export type EhlTeamLookup =
  | { ok: true; name: string; url: string; logoUrl: string | null }
  | { ok: false; error: "invalid" | "not_found" | "failed" };

export async function lookupEhlTeamName(rawUrl: string): Promise<EhlTeamLookup> {
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
    return { ok: true, name, url: url.toString(), logoUrl: readEhlTeamLogo(html, url.toString()) };
  } catch {
    return { ok: false, error: "failed" };
  }
}
