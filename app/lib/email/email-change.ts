import { createHash, randomBytes } from "node:crypto";
import { buildEmailHtml } from "@/app/lib/email/build-email-html";
import { asLang, translate } from "@/app/lib/messages";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { getSiteUrl } from "@/app/lib/site";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export function hashEmailToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function emailTakenByOther(admin: Admin, email: string, userId: string): Promise<boolean | null> {
  const listed = await admin.from("users").select("id").ilike("email", email.replaceAll("%", "\\%").replaceAll("_", "\\_")).neq("id", userId).limit(1);
  if (listed.error) return null;
  if ((listed.data?.length ?? 0) > 0) return true;

  const probe = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (!probe.error && probe.data.user && probe.data.user.id !== userId) return true;
  if (!probe.error) return false;
  const text = probe.error.message.toLowerCase();
  if (probe.error.code === "user_not_found" || text.includes("not found") || text.includes("user not found")) return false;
  return null;
}

export async function requestEmailChange(admin: Admin, userId: string, newEmail: string): Promise<boolean> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashEmailToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await admin.from("email_change_requests").delete().eq("user_id", userId);
  const inserted = await admin.from("email_change_requests").insert({ user_id: userId, new_email: newEmail, token_hash: tokenHash, expires_at: expiresAt });
  if (inserted.error) return false;

  const actionLink = `${getSiteUrl()}/auth/confirm-email?token=${encodeURIComponent(token)}`;
  const sent = await mailEmailChange(admin, newEmail, actionLink);
  if (!sent) await admin.from("email_change_requests").delete().eq("token_hash", tokenHash);
  return sent;
}

async function mailEmailChange(admin: Admin, email: string, actionLink: string): Promise<boolean> {
  const integration = await admin.from("site_integrations").select("client_id, client_secret, is_configured, is_enabled").eq("integration_key", "resend").maybeSingle();
  const fromEmail = integration.data?.client_id?.trim() ?? "";
  const apiKey = openIntegrationSecret(integration.data?.client_secret);
  if (!integration.data?.is_enabled || !integration.data.is_configured || !fromEmail || !apiKey) return false;

  const brand = await getSiteBrand();
  const language = await admin.from("site_languages").select("code").eq("is_default", true).maybeSingle();
  const lang = asLang(language.data?.code);
  const html = buildEmailHtml({
    systemName: brand.name,
    eyebrow: translate(lang, "auth.email_change.eyebrow"),
    heading: translate(lang, "auth.email_change.mail_subject"),
    bodyText: translate(lang, "auth.email_change.mail_body"),
    buttonLabel: translate(lang, "auth.email_change.mail_button"),
    actionLink,
    footerHint: translate(lang, "admin.email.footer"),
    language: lang,
  });
  const from = fromEmail.includes("<") ? fromEmail : `${brand.name} <${fromEmail}>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: translate(lang, "auth.email_change.mail_subject"), html }),
  });
  return response.ok;
}
