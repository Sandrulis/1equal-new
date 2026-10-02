import { getAccountProfile } from "@/app/lib/auth/session";
import { listSystemTeamMembers, listSystemUsers, loadTranslationCatalog } from "@/app/lib/site-admin/repository";

export async function GET(request: Request) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  if (!account.isAdmin) return Response.json({ ok: false }, { status: 403 });
  const section = new URL(request.url).searchParams.get("section");
  if (section === "users") {
    const users = await listSystemUsers();
    return Response.json({ ok: true, usersLoaded: true, users, userCount: users.length });
  }
  if (section === "translations") {
    const translations = await loadTranslationCatalog();
    return Response.json({ ok: true, translationsLoaded: true, translations, translationCount: translations.length });
  }
  if (section === "teams") {
    const members = await listSystemTeamMembers();
    return Response.json({ ok: true, membersLoaded: true, members });
  }
  return Response.json({ ok: false }, { status: 400 });
}
