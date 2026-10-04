"use server";

import { getAccountProfile } from "@/app/lib/auth/session";
import { accountName } from "@/app/lib/auth/profile";
import { buildEmailHtml } from "@/app/lib/email/build-email-html";
import { asLang, translate, type Lang, type MessageKey } from "@/app/lib/messages";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type FeedbackKind = "bug" | "suggestion" | "feedback";

const TITLE_MAX = 200;
const BODY_MAX = 4000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 5;
const recentSends = new Map<string, number[]>();

function limited(userId: string): boolean {
  const now = Date.now();
  const stamps = (recentSends.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (stamps.length >= MAX_SENDS) {
    recentSends.set(userId, stamps);
    return true;
  }
  stamps.push(now);
  recentSends.set(userId, stamps);
  return false;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
}

export async function sendUserFeedback(input: {
  kind: FeedbackKind;
  title: string;
  body: string;
  rating?: number;
}): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const account = await getAccountProfile();
  if (!account?.email) return { ok: false, error: "feedback.error.auth" };
  if (input.kind !== "bug" && input.kind !== "suggestion" && input.kind !== "feedback") {
    return { ok: false, error: "feedback.error.invalid" };
  }

  const title = input.title.trim().slice(0, TITLE_MAX);
  const body = input.body.trim().slice(0, BODY_MAX);
  const rating = input.kind === "feedback" ? input.rating : undefined;
  if (input.kind === "feedback") {
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: "feedback.error.rating" };
    }
  } else if (!title) {
    return { ok: false, error: "feedback.error.invalid" };
  }
  if (body.length < 2) return { ok: false, error: "feedback.error.invalid" };
  if (limited(account.id)) return { ok: false, error: "feedback.error.rate" };

  const client = createAdminClient();
  if (!client) return { ok: false, error: "feedback.error.unavailable" };
  const saved = await client.from("site_user_feedback").insert({
    kind: input.kind,
    title,
    body,
    rating: input.kind === "feedback" ? rating : null,
    user_id: account.id,
  });
  if (saved.error) return { ok: false, error: "feedback.error.unavailable" };

  const brand = await getSiteBrand();
  const integration = await client
    .from("site_integrations")
    .select("client_id, client_secret, is_configured, is_enabled")
    .eq("integration_key", "resend")
    .maybeSingle();
  const fromEmail = integration.data?.client_id?.trim() ?? "";
  const apiKey = openIntegrationSecret(integration.data?.client_secret);
  if (!isEmail(brand.contactEmail) || !integration.data?.is_enabled || !integration.data.is_configured || !fromEmail || !apiKey) {
    return { ok: true };
  }

  const language = await client.from("site_languages").select("code").eq("is_default", true).maybeSingle();
  const lang: Lang = asLang(language.data?.code);
  const name = accountName(account) || account.email;
  const subjectKey =
    input.kind === "bug" ? "feedback.email.subject.bug" : input.kind === "suggestion" ? "feedback.email.subject.suggestion" : "feedback.email.subject.feedback";
  const subject = translate(lang, subjectKey, { title, rating: rating ?? 0 });
  const lines = [
    `${translate(lang, "landing.contact.name")}: ${name}`,
    `${translate(lang, "auth.email")}: ${account.email}`,
  ];
  if (input.kind === "feedback") lines.push(`${translate(lang, "feedback.general.rating")}: ${rating}/5`);
  if (title) lines.push("", title);
  lines.push("", body);
  const from = fromEmail.includes("<") ? fromEmail : `${brand.name} <${fromEmail}>`;
  const html = buildEmailHtml({
    systemName: brand.name,
    heading: translate(lang, input.kind === "bug" ? "nav.report_bug" : input.kind === "suggestion" ? "nav.suggestions" : "nav.feedback"),
    bodyText: lines.join("\n"),
    buttonLabel: translate(lang, "landing.contact.reply"),
    actionLink: `mailto:${encodeURIComponent(account.email)}`,
    footerHint: brand.name,
    language: lang,
  });

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [brand.contactEmail],
      reply_to: account.email,
      subject,
      html,
    }),
  });
  return { ok: true };
}
