import { headers } from "next/headers";
import { getSiteUrl } from "@/app/lib/site";

function isLocalHost(host: string): boolean {
  const hostname = host.split(":")[0]?.replace(/^\[|\]$/g, "").toLowerCase() ?? "";
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "0.0.0.0" || hostname === "::1" || hostname.startsWith("127.");
}

export function publicOriginFrom(headerStore: { get(name: string): string | null }, fallbackUrl: string): string {
  const fallback = new URL(fallbackUrl);
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const host = forwardedHost || headerStore.get("host")?.trim() || fallback.host;
  if (isLocalHost(host)) return fallback.origin;
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ?? "";
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
  return `${proto}://${host}`;
}

export function publicRequestOrigin(request: Request): string {
  return publicOriginFrom(request.headers, request.url);
}

export async function currentPublicOrigin(): Promise<string> {
  return publicOriginFrom(await headers(), `${getSiteUrl()}/`);
}
