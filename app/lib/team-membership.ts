import { getAccountProfile } from "@/app/lib/auth/session";
import type { BalanceEntry, Member, Venue } from "@/app/lib/demo-data";
import { readStoredEhlPlayer } from "@/app/lib/ehl-player";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import type { IssuedTeam } from "@/app/lib/invite-code";
import type { Subteam } from "@/app/lib/demo-data";
import { roleFromPosition } from "@/app/lib/team-creator";
import { createAdminClient } from "@/app/lib/supabase/admin";

type UserName = { email: string; name: string; first_name: string; last_name: string };

type MemberRow = {
  team_id: string;
  user_id: string;
  jersey_number: number | null;
  position: string;
  phone: string;
  ehl_player: unknown;
  fee_exempt: boolean;
  joined_on: string;
  updated_at: string;
  users: UserName | UserName[] | null;
};

type TeamRow = {
  id: string;
  name: string;
  invite_code: string | null;
  source_url: string | null;
  logo_url: string | null;
  leader_id: string | null;
  updated_at: string;
};

type EntryRow = {
  id: string;
  team_id: string;
  user_id: string;
  amount: number | string;
  created_at: string;
};

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function personName(user: UserName | null, fallback: string): string {
  if (!user) return fallback;
  const parts = [user.first_name, user.last_name].map((part) => part.trim()).filter(Boolean);
  return parts.join(" ") || user.name.trim() || user.email || fallback;
}

export function memberFromRow(row: MemberRow, subteamIds: string[] = []): Member {
  const user = one(row.users);
  const ehl = readStoredEhlPlayer(row.ehl_player);
  const position = row.position.trim() || ehl?.position || "";
  return {
    id: row.user_id,
    name: ehl?.name || personName(user, ""),
    email: user?.email ?? "",
    phone: row.phone ?? "",
    number: row.jersey_number,
    position,
    role: roleFromPosition(position),
    subteamId: subteamIds[0] ?? "",
    subteamIds,
    feeExempt: row.fee_exempt === true,
    balance: 0,
    ledger: [],
    joined: row.joined_on,
    updatedAt: toLocalDateTimeStamp(row.updated_at),
    photoUrl: ehl?.photoUrl ?? null,
    ehl,
  };
}

export async function listOwnedTeams(userId: string): Promise<IssuedTeam[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const mine = await admin.from("team_members").select("team_id").eq("user_id", userId);
  if (mine.error || !mine.data?.length) return [];
  const teamIds = mine.data.map((row) => row.team_id);
  const [teams, members, groups, links, entries, places] = await Promise.all([
    admin.from("teams").select("id, name, invite_code, source_url, logo_url, leader_id, updated_at").in("id", teamIds).order("updated_at", { ascending: false }),
    admin
      .from("team_members")
      .select("team_id, user_id, jersey_number, position, phone, ehl_player, fee_exempt, joined_on, updated_at, users(email, name, first_name, last_name)")
      .in("team_id", teamIds),
    admin.from("subteams").select("id, team_id, name, color, updated_at").in("team_id", teamIds),
    admin.from("team_member_subteams").select("team_id, user_id, subteam_id").in("team_id", teamIds),
    admin.from("balance_entries").select("id, team_id, user_id, amount, created_at").in("team_id", teamIds).order("created_at", { ascending: false }),
    admin.from("venues").select("id, team_id, name, price_per_hour, hidden, updated_at").in("team_id", teamIds),
  ]);
  if (teams.error || !teams.data || members.error || !members.data) return [];
  const idsByMember = new Map<string, string[]>();
  for (const link of (links.data ?? []) as { team_id: string; user_id: string; subteam_id: string }[]) {
    const key = `${link.team_id}:${link.user_id}`;
    const list = idsByMember.get(key) ?? [];
    list.push(link.subteam_id);
    idsByMember.set(key, list);
  }
  const entriesByMember = new Map<string, BalanceEntry[]>();
  for (const row of (entries.data ?? []) as EntryRow[]) {
    const key = `${row.team_id}:${row.user_id}`;
    const list = entriesByMember.get(key) ?? [];
    list.push({ id: row.id, amount: Number(row.amount), at: toLocalDateTimeStamp(row.created_at) });
    entriesByMember.set(key, list);
  }
  const byTeam = new Map<string, Member[]>();
  for (const row of members.data as MemberRow[]) {
    const list = byTeam.get(row.team_id) ?? [];
    const key = `${row.team_id}:${row.user_id}`;
    const ledger = entriesByMember.get(key) ?? [];
    const member = memberFromRow(row, idsByMember.get(key) ?? []);
    member.ledger = ledger;
    member.balance = Math.round(ledger.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    list.push(member);
    byTeam.set(row.team_id, list);
  }
  const subteamsByTeam = new Map<string, Subteam[]>();
  for (const row of (groups.data ?? []) as { id: string; team_id: string; name: string; color: string; updated_at: string }[]) {
    const list = subteamsByTeam.get(row.team_id) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color, updatedAt: toLocalDateTimeStamp(row.updated_at) });
    subteamsByTeam.set(row.team_id, list);
  }
  const venuesByTeam = new Map<string, Venue[]>();
  for (const row of (places.data ?? []) as { id: string; team_id: string; name: string; price_per_hour: number | string; hidden: boolean; updated_at: string }[]) {
    const list = venuesByTeam.get(row.team_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      area: "",
      pricePerHour: Number(row.price_per_hour),
      hidden: row.hidden === true,
      updatedAt: toLocalDateTimeStamp(row.updated_at),
    });
    venuesByTeam.set(row.team_id, list);
  }
  return (teams.data as TeamRow[])
    .filter((team) => team.invite_code)
    .map((team) => ({
      id: team.id,
      name: team.name,
      code: team.invite_code as string,
      demo: false,
      sourceUrl: team.source_url,
      logoUrl: team.logo_url,
      leaderId: team.leader_id,
      members: byTeam.get(team.id) ?? [],
      subteams: subteamsByTeam.get(team.id) ?? [],
      venues: venuesByTeam.get(team.id) ?? [],
    }));
}

export async function requireUserAdmin() {
  const account = await getAccountProfile();
  const client = account ? createAdminClient() : null;
  if (!account || !client) return null;
  return { account, client };
}
