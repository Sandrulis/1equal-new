import { balanceRangeOk } from "@/app/lib/balance-range";
import { getAccountProfile } from "@/app/lib/auth/session";
import { canReadTeam, listMemberLedger, listTeamLedger } from "@/app/lib/team-membership";

export async function GET(request: Request, context: { params: Promise<{ teamId: string }> }) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  const { teamId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return Response.json({ ok: false }, { status: 400 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!balanceRangeOk(from, to)) return Response.json({ ok: false }, { status: 400 });
  const userId = url.searchParams.get("userId") ?? "";
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ ok: false }, { status: 400 });
  if (!(await canReadTeam(account.id, teamId, account.isAdmin))) return Response.json({ ok: false }, { status: 403 });
  if (userId) {
    const entries = await listMemberLedger(teamId, userId, from, to);
    return Response.json({ ok: true, entries });
  }
  const entries = await listTeamLedger(teamId, from, to);
  return Response.json({ ok: true, entries });
}
