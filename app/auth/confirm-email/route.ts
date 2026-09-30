import { NextResponse } from "next/server";
import { hashEmailToken } from "@/app/lib/email/email-change";
import { getSiteUrl } from "@/app/lib/site";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const login = `${getSiteUrl()}/login`;
  if (!token || token.length > 200) return NextResponse.redirect(login);

  const admin = createAdminClient();
  const supabase = getSupabasePublicEnv();
  if (!admin || !supabase) return NextResponse.redirect(login);

  const row = await admin
    .from("email_change_requests")
    .select("user_id, new_email, expires_at")
    .eq("token_hash", hashEmailToken(token))
    .maybeSingle();
  if (row.error || !row.data || new Date(row.data.expires_at).getTime() <= Date.now()) return NextResponse.redirect(login);

  const email = row.data.new_email.trim().toLowerCase();
  const taken = await admin.from("users").select("id").ilike("email", email.replaceAll("%", "\\%").replaceAll("_", "\\_")).neq("id", row.data.user_id).limit(1);
  if (taken.error || (taken.data?.length ?? 0) > 0) return NextResponse.redirect(login);

  const updated = await admin.auth.admin.updateUserById(row.data.user_id, { email, email_confirm: true });
  if (updated.error) return NextResponse.redirect(login);
  await admin.from("users").update({ email }).eq("id", row.data.user_id);
  await admin.from("email_change_requests").delete().eq("user_id", row.data.user_id);

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  });
  const actionLink = link.data.properties?.action_link;
  if (link.error || !actionLink) return NextResponse.redirect(login);
  try {
    const target = new URL(actionLink);
    if (target.origin !== new URL(supabase.url).origin) return NextResponse.redirect(login);
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(login);
  }
}
