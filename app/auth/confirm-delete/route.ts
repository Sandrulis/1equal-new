import { NextResponse } from "next/server";
import { confirmAccountDeletionToken } from "@/app/lib/auth/account-deletion";
import { publicRequestOrigin } from "@/app/lib/public-origin";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const origin = publicRequestOrigin(request);
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const result = await confirmAccountDeletionToken(token);
  if (result === "invalid") return NextResponse.redirect(`${origin}/login?error=delete_link`);
  if (result === "user.delete.last_admin") return NextResponse.redirect(`${origin}/login?error=last_admin`);
  if (result !== "ok") return NextResponse.redirect(`${origin}/login?error=delete_failed`);

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?notice=deactivated`);
}
