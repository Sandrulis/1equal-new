"use server";

import { headers } from "next/headers";
import { buildEmailHtml } from "@/app/lib/email/build-email-html";
import { trustedClientIp } from "@/app/lib/security/client-ip";
import { asLang, translate, type Lang, type MessageKey } from "@/app/lib/messages";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { rateLimit } from "@/app/lib/security/rate-limit";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendContactMessage(formData: FormData): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  if (readField(formData, "website")) return { ok: true };

  const name = readField(formData, "name").slice(0, 80);
  const email = readField(formData, "email").toLowerCase();
  const subject = readField(formData, "subject").replace(/[\r\n]/g, " ").slice(0, 120);
  const message = readField(formData, "message").slice(0, 2000);
  if (!name || !isEmail(email) || subject.length < 2 || message.length < 2) return { ok: false, error: "landing.contact.error.invalid" };
  const ip = trustedClientIp(await headers()) || "local";
  if (await rateLimit(`contact:${ip}`, 5, 15 * 60 * 1000)) return { ok: false, error: "feedback.error.rate" };

  const client = createAdminClient();
  if (!client) return { ok: false, error: "landing.contact.error.unavailable" };
  const brand = await getSiteBrand();
  if (!isEmail(brand.contactEmail)) return { ok: false, error: "landing.contact.error.unavailable" };

  const integration = await client
    .from("site_integrations")
    .select("client_id, client_secret, is_configured, is_enabled")
    .eq("integration_key", "resend")
    .maybeSingle();
  const fromEmail = integration.data?.client_id?.trim() ?? "";
  const apiKey = openIntegrationSecret(integration.data?.client_secret);
  if (!integration.data?.is_enabled || !integration.data.is_configured || !fromEmail || !apiKey) {
    return { ok: false, error: "landing.contact.error.unavailable" };
  }

  const language = await client.from("site_languages").select("code").eq("is_default", true).maybeSingle();
  const lang: Lang = asLang(language.data?.code);
  const from = fromEmail.includes("<") ? fromEmail : `${brand.name} <${fromEmail}>`;
  const html = buildEmailHtml({
    systemName: brand.name,
    heading: translate(lang, "landing.contact.title"),
    bodyText: `${translate(lang, "landing.contact.name")}: ${name}\n${translate(lang, "auth.email")}: ${email}\n${translate(lang, "admin.email.subject")}: ${subject}\n\n${message}`,
    buttonLabel: translate(lang, "landing.contact.reply"),
    actionLink: `mailto:${encodeURIComponent(email)}`,
    footerHint: brand.name,
    language: lang,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [brand.contactEmail],
      reply_to: email,
      subject,
      html,
    }),
  });
  if (!response.ok) return { ok: false, error: "landing.contact.error.send" };
  return { ok: true };
}
