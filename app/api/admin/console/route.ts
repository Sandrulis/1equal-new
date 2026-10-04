import { getAccountProfile } from "@/app/lib/auth/session";
import { ADMIN_SECTIONS, type AdminSection } from "@/app/lib/dashboard-path";
import { listSystemTeamMembers, listSystemUsers, loadAdminConsole, loadTranslationCatalog } from "@/app/lib/site-admin/repository";

function isAdminSection(value: string | null): value is AdminSection {
  return ADMIN_SECTIONS.some((section) => section === value);
}

export async function GET(request: Request) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  if (!account.isAdmin) return Response.json({ ok: false }, { status: 403 });
  const url = new URL(request.url);
  const section = url.searchParams.get("section");
  if (url.searchParams.get("full") === "1" && isAdminSection(section)) {
    const admin = await loadAdminConsole(account.id, section);
    return Response.json({ ok: true, admin });
  }
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
