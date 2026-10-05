import { loadTeamAttendance } from "@/app/lib/attendance-stats";
import { getAccountProfile } from "@/app/lib/auth/session";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { moduleEnabledForSport } from "@/app/lib/sport-module";
import { canReadTeam } from "@/app/lib/team-membership";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  const { teamId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return Response.json({ ok: false }, { status: 400 });
  if (!(await canReadTeam(account.id, teamId, account.isAdmin))) return Response.json({ ok: false }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return Response.json({ ok: false }, { status: 503 });

  const [team, members, links] = await Promise.all([
    admin.from("teams").select("leader_id, sport_id").eq("id", teamId).maybeSingle(),
    admin.from("team_members").select("user_id, joined_on, is_team_admin").eq("team_id", teamId),
    admin.from("team_member_subteams").select("user_id, subteam_id").eq("team_id", teamId),
  ]);
  if (team.error || !team.data || members.error || !members.data) return Response.json({ ok: false }, { status: 404 });
  const maySee =
    account.isAdmin ||
    team.data.leader_id === account.id ||
    members.data.some((member) => member.user_id === account.id && member.is_team_admin === true);
  const enabled = maySee && (await moduleEnabledForSport(admin, team.data.sport_id, FRONTEND_MODULE_KEYS.playerEventStats, teamId));
  if (!enabled) return Response.json({ ok: true, attendance: null });

  const subteams = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const list = subteams.get(link.user_id) ?? [];
    list.push(link.subteam_id);
    subteams.set(link.user_id, list);
  }
  const stats = await loadTeamAttendance(
    admin,
    teamId,
    members.data.map((member) => {
      const ids = subteams.get(member.user_id) ?? [];
      return { id: member.user_id, joined: member.joined_on, subteamId: ids[0] ?? "", subteamIds: ids };
    }),
  );
  if (!stats) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, attendance: Object.fromEntries(stats) });
}
