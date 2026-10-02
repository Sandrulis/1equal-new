import { getAccountProfile } from "@/app/lib/auth/session";
import { canReadTeam, listEventLineup } from "@/app/lib/team-membership";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string; eventId: string }> }) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  const { teamId, eventId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(teamId) || !/^[0-9a-f-]{36}$/i.test(eventId)) return Response.json({ ok: false }, { status: 400 });
  if (!(await canReadTeam(account.id, teamId, account.isAdmin))) return Response.json({ ok: false }, { status: 403 });
  const lineup = await listEventLineup(teamId, eventId);
  if (!lineup) return Response.json({ ok: false }, { status: 404 });
  return Response.json({ ok: true, slots: lineup.lineupSlots ?? {}, sides: lineup.lineupSides ?? {} });
}
