import { getAccountProfile } from "@/app/lib/auth/session";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { canReadTeam } from "@/app/lib/team-membership";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return Response.json({ ok: false }, { status: 400 });
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  if (!(await canReadTeam(account.id, teamId, account.isAdmin))) return Response.json({ ok: false }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return Response.json({ ok: false }, { status: 500 });
  const row = await admin.from("teams").select("content_updated_at").eq("id", teamId).maybeSingle();
  if (row.error || !row.data?.content_updated_at) return Response.json({ ok: false }, { status: 404 });
  return Response.json({ ok: true, revision: row.data.content_updated_at });
}
