import { getAccountProfile } from "@/app/lib/auth/session";
import { canReadTeam, listMemberLedger } from "@/app/lib/team-membership";

export async function GET(request: Request, context: { params: Promise<{ teamId: string }> }) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  const { teamId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return Response.json({ ok: false }, { status: 400 });
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ ok: false }, { status: 400 });
  if (!(await canReadTeam(account.id, teamId, account.isAdmin))) return Response.json({ ok: false }, { status: 403 });
  const entries = await listMemberLedger(teamId, userId);
  const balance = Math.round(entries.reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100;
  return Response.json({ ok: true, entries, balance });
}
