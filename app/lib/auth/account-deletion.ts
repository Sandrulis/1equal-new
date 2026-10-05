import { randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import { removeAvatar } from "@/app/lib/avatar-storage";
import { buildEmailHtml, fillEmailText, plainDash } from "@/app/lib/email/build-email-html";
import { hashEmailToken } from "@/app/lib/email/email-change";
import { formatDisplayDate } from "@/app/lib/format";
import { asLang, translate, type MessageKey } from "@/app/lib/messages";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { getSiteUrl } from "@/app/lib/site";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const ACCOUNT_RESTORED_COOKIE = "account_restored";
const GRACE_MS = 30 * 24 * 60 * 60 * 1000;
const CONFIRM_MS = 24 * 60 * 60 * 1000;
const CLAIM_STALE_MS = 15 * 60 * 1000;

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
type MailResult = "sent" | "unavailable" | "failed";
type ClaimRow = { user_id: string; user_email: string | null };

export function accountRestoredCookieOptions() {
  const secure = process.env.NODE_ENV === "production" || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  return { path: "/", sameSite: "lax" as const, secure, httpOnly: true, maxAge: 120 };
}

export function withAccountRestoredCookie(response: NextResponse) {
  response.cookies.set(ACCOUNT_RESTORED_COOKIE, "1", accountRestoredCookieOptions());
  return response;
}

export async function deletionBlockedReason(userId: string): Promise<MessageKey | null> {
  const admin = createAdminClient();
  if (!admin) return "auth.error.config";
  const profile = await admin.from("users").select("is_admin").eq("id", userId).maybeSingle();
  if (profile.error) return "auth.error.generic";
  if (profile.data?.is_admin !== true) return null;
  const admins = await admin.from("users").select("id", { count: "exact", head: true }).eq("is_admin", true);
  if (admins.error) return "auth.error.generic";
  if ((admins.count ?? 0) <= 1) return "user.delete.last_admin";
  return null;
}

export async function sendAccountDeletionConfirmation(userId: string, email: string): Promise<{ error: MessageKey } | { sent: true }> {
  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };
  const blocked = await deletionBlockedReason(userId);
  if (blocked) return { error: blocked };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashEmailToken(token);
  const expiresAt = new Date(Date.now() + CONFIRM_MS).toISOString();
  const saved = await admin.from("account_deletion_confirmations").upsert(
    { user_id: userId, token_hash: tokenHash, expires_at: expiresAt, created_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (saved.error) return { error: "auth.error.generic" };

  const actionLink = `${getSiteUrl()}/auth/confirm-delete?token=${encodeURIComponent(token)}`;
  const mailed = await sendAccountDeletionEmail(admin, userId, email, "confirm", undefined, actionLink);
  if (mailed !== "sent") {
    await admin.from("account_deletion_confirmations").delete().eq("user_id", userId);
    return { error: "user.delete.email_failed" };
  }
  return { sent: true };
}

export async function confirmAccountDeletionToken(token: string): Promise<"ok" | "invalid" | MessageKey> {
  if (!token || token.length > 200) return "invalid";
  const admin = createAdminClient();
  if (!admin) return "auth.error.config";
  const row = await admin
    .from("account_deletion_confirmations")
    .select("user_id, expires_at")
    .eq("token_hash", hashEmailToken(token))
    .maybeSingle();
  if (row.error || !row.data || new Date(row.data.expires_at).getTime() <= Date.now()) return "invalid";

  const blocked = await deletionBlockedReason(row.data.user_id);
  if (blocked) return blocked;

  const person = await admin.from("users").select("email").eq("id", row.data.user_id).maybeSingle();
  const email = person.data?.email?.trim().toLowerCase() ?? "";
  if (!email) return "invalid";

  const scheduled = await scheduleAccountDeletion(row.data.user_id, email);
  if ("error" in scheduled) return scheduled.error;
  await admin.from("account_deletion_confirmations").delete().eq("user_id", row.data.user_id);
  return "ok";
}

export async function scheduleAccountDeletion(userId: string, email: string): Promise<{ error: MessageKey } | { ok: true }> {
  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };
  const due = new Date(Date.now() + GRACE_MS).toISOString();
  const saved = await admin
    .from("users")
    .update({
      deletion_requested_at: new Date().toISOString(),
      deletion_due_at: due,
      deletion_claimed_at: null,
    })
    .eq("id", userId);
  if (saved.error) return { error: "auth.error.generic" };

  const mailed = await sendAccountDeletionEmail(admin, userId, email, "deactivated", due);
  if (mailed !== "sent") {
    await admin.from("users").update({ deletion_requested_at: null, deletion_due_at: null, deletion_claimed_at: null }).eq("id", userId);
    return { error: "user.delete.email_failed" };
  }

  await admin.auth.admin.signOut(userId, "global");
  return { ok: true };
}

export async function settleAccountDeletionOnSignIn(userId: string): Promise<"restored" | "deleted" | "none"> {
  const admin = createAdminClient();
  if (!admin) return "none";
  const row = await admin.from("users").select("deletion_due_at, email").eq("id", userId).maybeSingle();
  if (row.error || !row.data?.deletion_due_at) return "none";
  const due = new Date(row.data.deletion_due_at).getTime();
  if (!Number.isFinite(due)) return "none";
  if (due > Date.now()) {
    const cleared = await admin
      .from("users")
      .update({ deletion_requested_at: null, deletion_due_at: null, deletion_claimed_at: null })
      .eq("id", userId)
      .gt("deletion_due_at", new Date().toISOString())
      .select("id");
    return cleared.data?.length ? "restored" : "none";
  }

  const now = new Date().toISOString();
  const stale = new Date(Date.now() - CLAIM_STALE_MS).toISOString();
  const claimed = await admin
    .from("users")
    .update({ deletion_claimed_at: now })
    .eq("id", userId)
    .lte("deletion_due_at", now)
    .or(`deletion_claimed_at.is.null,deletion_claimed_at.lt."${stale}"`)
    .select("email");
  const email = claimed.data?.[0]?.email ?? row.data.email ?? "";
  if (!claimed.data?.length) {
    const again = await admin.from("users").select("id, deletion_due_at").eq("id", userId).maybeSingle();
    if (!again.data || again.data.deletion_due_at) return "deleted";
    return "none";
  }
  const removed = await deleteScheduledAccount(admin, userId, email);
  return removed ? "deleted" : "none";
}

export async function purgeDueAccounts(): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const claimed = await admin.rpc("claim_due_account_deletions", { batch_size: 20 });
  if (claimed.error || !Array.isArray(claimed.data)) {
    if (claimed.error) console.error("account deletion claim failed");
    return 0;
  }
  let removed = 0;
  for (const row of claimed.data as ClaimRow[]) {
    if (!row?.user_id) continue;
    const done = await deleteScheduledAccount(admin, row.user_id, row.user_email ?? "");
    if (done) removed += 1;
  }
  return removed;
}

async function deleteScheduledAccount(admin: Admin, userId: string, email: string): Promise<boolean> {
  const mailed = email.trim() ? await sendAccountDeletionEmail(admin, userId, email.trim(), "deleted") : "unavailable";
  if (mailed === "failed") {
    await admin.from("users").update({ deletion_claimed_at: null }).eq("id", userId);
    return false;
  }
  const released = await admin.rpc("release_user_for_deletion", { target: userId });
  if (released.error) {
    await admin.from("users").update({ deletion_claimed_at: null }).eq("id", userId);
    console.error("account deletion release failed");
    return false;
  }
  const removed = await admin.auth.admin.deleteUser(userId);
  if (removed.error) {
    await admin.from("users").update({ deletion_claimed_at: null }).eq("id", userId);
    console.error("account deletion failed");
    return false;
  }
  await removeAvatar(`users/${userId}.jpg`);
  return true;
}

async function sendAccountDeletionEmail(admin: Admin, userId: string, email: string, kind: "deactivated" | "deleted" | "confirm", dueIso?: string, actionLink?: string): Promise<MailResult> {
  const integration = await admin
    .from("site_integrations")
    .select("client_id, client_secret, is_configured, is_enabled")
    .eq("integration_key", "resend")
    .maybeSingle();
  const fromEmail = integration.data?.client_id?.trim() ?? "";
  const apiKey = openIntegrationSecret(integration.data?.client_secret);
  if (!integration.data?.is_enabled || !integration.data.is_configured || !fromEmail || !apiKey) return "unavailable";

  const brand = await getSiteBrand();
  const language = await admin.from("site_languages").select("code").eq("is_default", true).maybeSingle();
  const lang = asLang(language.data?.code);
  const deactivated = kind === "deactivated";
  const confirm = kind === "confirm";
  const templateKind = confirm ? "delete_confirm" : deactivated ? "delete_started" : "delete_done";
  const template = await admin.from("email_templates").select("subject, body, button_label").eq("kind", templateKind).eq("language_code", lang).maybeSingle();
  const person = await admin.from("users").select("first_name, last_name, name").eq("id", userId).maybeSingle();
  const fullName = [person.data?.first_name, person.data?.last_name].map((part) => part?.trim() ?? "").filter(Boolean).join(" ");
  const date = dueIso ? formatDisplayDate(dueIso, brand.display) : "";
  const params = { name: fullName || person.data?.name?.trim() || email, system: brand.name, date };
  const subjectKey = confirm ? "user.delete.mail_confirm_subject" : deactivated ? "user.delete.mail_deactivated_subject" : "user.delete.mail_deleted_subject";
  const bodyKey = confirm ? "user.delete.mail_confirm_body" : deactivated ? "user.delete.mail_deactivated_body" : "user.delete.mail_deleted_body";
  const buttonKey = confirm ? "user.delete.mail_confirm_button" : deactivated ? "user.delete.mail_deactivated_button" : null;
  const eyebrowKey = confirm ? "admin.email.kind.delete_confirm" : deactivated ? "admin.email.kind.delete_started" : "admin.email.kind.delete_done";
  const subject = plainDash(fillEmailText(template.data?.subject?.trim() || translate(lang, subjectKey), params));
  const bodyText = plainDash(fillEmailText(template.data?.body?.trim() || translate(lang, bodyKey, date ? { date } : undefined), params));
  const buttonSource = template.data ? (template.data.button_label ?? "") : buttonKey ? translate(lang, buttonKey) : "";
  const buttonLabel = plainDash(fillEmailText(buttonSource, params)).trim();
  const html = buildEmailHtml({
    systemName: brand.name,
    eyebrow: translate(lang, eyebrowKey),
    heading: subject,
    bodyText,
    buttonLabel,
    actionLink: confirm ? actionLink ?? "" : `${getSiteUrl()}/login`,
    footerHint: translate(lang, "user.delete.mail_footer"),
    tagline: brand.slogans[lang] ?? "",
    language: lang,
  });
  const from = fromEmail.includes("<") ? fromEmail : `${brand.name} <${fromEmail}>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject, html }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
