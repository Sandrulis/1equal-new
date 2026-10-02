import { getAccountProfile } from "@/app/lib/auth/session";
import { canReadTeam, listTeamHistory } from "@/app/lib/team-membership";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, context: { params: Promise<{ teamId: string }> }) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  const { teamId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return Response.json({ ok: false }, { status: 400 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DAY.test(from) || !DAY.test(to) || from > to) return Response.json({ ok: false }, { status: 400 });
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (!Number.isFinite(span) || span > 62) return Response.json({ ok: false }, { status: 400 });
  if (!(await canReadTeam(account.id, teamId, account.isAdmin))) return Response.json({ ok: false }, { status: 403 });
  const history = await listTeamHistory(teamId, from, to);
  return Response.json({ ok: true, ...history });
}
