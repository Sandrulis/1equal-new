import { getAccountProfile } from "@/app/lib/auth/session";
import { canReadTeam, listOwnedTeams } from "@/app/lib/team-membership";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  const { teamId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return Response.json({ ok: false }, { status: 400 });
  if (!(await canReadTeam(account.id, teamId, account.isAdmin))) return Response.json({ ok: false }, { status: 403 });
  const teams = await listOwnedTeams(account.id, teamId);
  const team = teams.find((item) => item.id === teamId && item.loaded !== false);
  if (!team) return Response.json({ ok: false }, { status: 404 });
  return Response.json({ ok: true, team });
}
