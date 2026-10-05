import { buildEmailHtml, fillEmailText, plainDash } from "@/app/lib/email/build-email-html";
import { messages, asLang, translate, type Lang } from "@/app/lib/messages";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { getSiteUrl } from "@/app/lib/site";
import { createAdminClient } from "@/app/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

function personName(row: { first_name?: string | null; last_name?: string | null; name?: string | null; email?: string | null } | null, email: string): string {
  const full = [row?.first_name, row?.last_name].map((part) => part?.trim() ?? "").filter(Boolean).join(" ");
  return full || row?.name?.trim() || email;
}

export async function sendTeamInvite(input: {
  admin: Admin;
  email: string;
  teamName: string;
  inviteCode: string;
  inviterName: string;
  imageUrl?: string | null;
  imageFit?: "cover" | "contain";
}): Promise<boolean> {
  const integration = await input.admin
    .from("site_integrations")
    .select("client_id, client_secret, configured_account_email, is_configured, is_enabled")
    .eq("integration_key", "resend")
    .maybeSingle();
  const fromEmail = integration.data?.client_id?.trim() ?? "";
  const apiKey = openIntegrationSecret(integration.data?.client_secret);
  if (!integration.data?.is_enabled || !integration.data.is_configured || !fromEmail || !apiKey) return false;

  const safe = input.email.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const person = await input.admin.from("users").select("first_name, last_name, name, language_code").ilike("email", safe).maybeSingle();
  const fallback = await input.admin.from("site_languages").select("code").eq("is_default", true).maybeSingle();
  const lang: Lang = asLang(person.data?.language_code || fallback.data?.code);
  const template = await input.admin.from("email_templates").select("subject, body, button_label").eq("kind", "invite").eq("language_code", lang).maybeSingle();
  const brand = await getSiteBrand();
  const params = {
    name: personName(person.data, input.email),
    team: input.teamName,
    inviter: input.inviterName,
    system: brand.name,
  };
  const subject = plainDash(fillEmailText(template.data?.subject?.trim() || messages["email.invite.subject"][lang], params));
  const body = fillEmailText(template.data?.body?.trim() || messages["email.invite.body"][lang], params);
  const button = plainDash(fillEmailText(template.data?.button_label?.trim() || messages["email.invite.button"][lang], params));
  const html = buildEmailHtml({
    systemName: brand.name,
    eyebrow: translate(lang, "admin.email.kind.invite"),
    heading: subject,
    bodyText: body,
    buttonLabel: button,
    actionLink: `${getSiteUrl()}/join/${input.inviteCode}`,
    footerHint: translate(lang, "admin.email.footer"),
    tagline: brand.slogans[lang] ?? "",
    language: lang,
    card: {
      label: translate(lang, "admin.users.team"),
      title: input.teamName,
      detail: translate(lang, "email.invite.by", { name: input.inviterName }),
      imageUrl: input.imageUrl,
      imageFit: input.imageFit,
    },
  });
  const from = fromEmail.includes("<") ? fromEmail : `${brand.name} <${fromEmail}>`;
  const replyTo = integration.data.configured_account_email?.trim() || undefined;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.email], subject, html, reply_to: replyTo }),
  });
  if (!response.ok) console.error("invite email send failed", response.status);
  return response.ok;
}
