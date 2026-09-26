import { TEAM_NAME, type Member, type Subteam, type TeamEvent, type Venue } from "@/app/lib/demo-data";

export const DEMO_INVITE_CODE = "RIGA4K";

export type IssuedTeam = {
  id?: string;
  name: string;
  code: string;
  demo: boolean;
  sourceUrl?: string | null;
  logoUrl?: string | null;
  leaderId?: string | null;
  members?: Member[];
  subteams?: Subteam[];
  venues?: Venue[];
  events?: TeamEvent[];
};

const issuedTeams = new Map<string, IssuedTeam>();
const myTeams: IssuedTeam[] = [];
let currentTeam: IssuedTeam | null = null;

export function getCurrentTeam(): IssuedTeam | null {
  return currentTeam;
}

export function listMyTeams(): IssuedTeam[] {
  return myTeams.slice();
}

export function setCurrentTeam(team: IssuedTeam | null) {
  if (typeof window === "undefined") return;
  currentTeam = team;
  if (!team) return;
  issuedTeams.set(team.code, team);
  const index = myTeams.findIndex((item) => item.code === team.code);
  if (index >= 0) myTeams[index] = team;
  else myTeams.push(team);
}

export function replaceMyTeams(teams: IssuedTeam[]) {
  if (typeof window === "undefined") return;
  myTeams.length = 0;
  issuedTeams.clear();
  currentTeam = null;
  for (const team of teams) setCurrentTeam(team);
}

export function forgetTeam(code: string) {
  const index = myTeams.findIndex((item) => item.code === code);
  if (index >= 0) myTeams.splice(index, 1);
  issuedTeams.delete(code);
  if (currentTeam?.code === code) currentTeam = myTeams[0] ?? null;
}

export function selectMyTeam(code: string): IssuedTeam | null {
  const team = myTeams.find((item) => item.code === code) ?? null;
  if (team) currentTeam = team;
  return team;
}

export function findIssuedTeam(code: string): IssuedTeam | null {
  return issuedTeams.get(code) ?? (code === DEMO_INVITE_CODE ? { name: TEAM_NAME, code, demo: true } : null);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createInviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code === DEMO_INVITE_CODE ? createInviteCode() : code;
}

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
