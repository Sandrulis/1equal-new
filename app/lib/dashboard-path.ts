import { EVENTS, MEMBERS } from "@/app/lib/demo-data";

export type DashboardBase = "/dashboard" | "/demo";

export type DashboardRoute =
  | { view: "home"; eventId: string | null; lineup: boolean }
  | { view: "team"; memberId: string | null }
  | { view: "subteams" }
  | { view: "venues" };

export function parseDashboardPath(path: string[] | undefined): DashboardRoute | null {
  const parts = path ?? [];
  if (parts.length === 0) return { view: "home", eventId: null, lineup: false };
  if (parts[0] === "team" && parts.length === 1) return { view: "team", memberId: null };
  if (parts[0] === "team" && parts.length === 2 && MEMBERS.some((member) => member.id === parts[1])) {
    return { view: "team", memberId: parts[1] };
  }
  if (parts[0] === "subteams" && parts.length === 1) return { view: "subteams" };
  if (parts[0] === "venues" && parts.length === 1) return { view: "venues" };
  const eventKnown = parts[0] === "events" && EVENTS.some((event) => event.id === parts[1]);
  if (eventKnown && parts.length === 2) return { view: "home", eventId: parts[1], lineup: false };
  if (eventKnown && parts.length === 3 && parts[2] === "lineup") return { view: "home", eventId: parts[1], lineup: true };
  return null;
}

export function routeFromPathname(pathname: string, basePath: DashboardBase): DashboardRoute {
  if (pathname === basePath) return { view: "home", eventId: null, lineup: false };
  const prefix = `${basePath}/`;
  if (!pathname.startsWith(prefix)) return { view: "home", eventId: null, lineup: false };
  return parseDashboardPath(pathname.slice(prefix.length).split("/").filter(Boolean)) ?? { view: "home", eventId: null, lineup: false };
}

export function teamHref(basePath: DashboardBase, memberId?: string | null): string {
  return memberId ? `${basePath}/team/${memberId}` : `${basePath}/team`;
}

export function eventHref(basePath: DashboardBase, eventId: string, lineup = false): string {
  return lineup ? `${basePath}/events/${eventId}/lineup` : `${basePath}/events/${eventId}`;
}
