import { createHash, randomBytes } from "node:crypto";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { refreshTeamData } from "@/app/lib/cache-tags";
import { castMemberVote } from "@/app/lib/attendance-vote";
import { buildEmailHtml, fillEmailText, plainDash } from "@/app/lib/email/build-email-html";
import { eventHref } from "@/app/lib/dashboard-path";
import { eventVotingOpen } from "@/app/lib/event-voting";
import { formatClock, formatDisplayDate, formatMoney } from "@/app/lib/format";
import { messages, asLang, translate, type Lang, type MessageKey } from "@/app/lib/messages";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { getSiteUrl } from "@/app/lib/site";
import { createAdminClient } from "@/app/lib/supabase/admin";
import type { TeamEvent } from "@/app/lib/demo-data";
import { DEFAULT_GAME_VOTING_HOURS, DEFAULT_TRAINING_VOTING_HOURS, isCurrency, type CurrencyCode } from "@/app/lib/team-defaults";

type VoteChoice = "going" | "absent";

export type EmailVoteResult = {
  state: "going" | "absent" | "closed" | "invalid" | "error";
  current: VoteChoice | "pending" | null;
  summary: string;
  lang: Lang;
  dashboardUrl: string;
};

function mailLang(code: string | null | undefined): Lang {
  return asLang(code);
}

function personName(row: { first_name?: string | null; last_name?: string | null; name?: string | null; email?: string | null }): string {
  const full = [row.first_name, row.last_name].map((part) => part?.trim() ?? "").filter(Boolean).join(" ");
  return full || row.name?.trim() || row.email?.trim() || "";
}

function voteLinks(token: string): { going: string; absent: string } {
  const base = getSiteUrl();
  return { going: `${base}/v/${token}/going`, absent: `${base}/v/${token}/absent` };
}

export async function notifyNewEvent(event: TeamEvent, teamId: string): Promise<void> {
  try {
    const client = createAdminClient();
    if (!client) return;
    const integration = await client
      .from("site_integrations")
      .select("client_id, client_secret, configured_account_email, is_configured, is_enabled")
      .eq("integration_key", "resend")
      .maybeSingle();
    const fromEmail = integration.data?.client_id?.trim() ?? "";
    const apiKey = openIntegrationSecret(integration.data?.client_secret);
    if (!integration.data?.is_enabled || !integration.data.is_configured || !fromEmail || !apiKey) return;

    const brand = await getSiteBrand();
    const language = await client.from("site_languages").select("code").eq("is_default", true).maybeSingle();
    const lang = mailLang(language.data?.code);
    const template = await client.from("email_templates").select("subject, body, button_label").eq("kind", "event").eq("language_code", lang).maybeSingle();
    const team = await client.from("teams").select("name, currency").eq("id", teamId).maybeSingle();
    if (!team.data) return;
    const venue = await client.from("venues").select("name, price_per_hour").eq("id", event.venueId).maybeSingle();
    const currency: CurrencyCode = isCurrency(team.data.currency) ? team.data.currency : brand.currency;
    const price = Number(venue.data?.price_per_hour ?? 0);
    const typeKey: MessageKey = event.type === "game" ? "legend.game" : "legend.training";
    const params = {
      name: "",
      system: brand.name,
      team: team.data.name,
      date: formatDisplayDate(event.date, brand.display),
      time: formatClock(event.start, brand.display.timeFormat),
      type: translate(lang, typeKey),
      venue: venue.data?.name?.trim() || "-",
      price: formatMoney(Number.isFinite(price) ? price : 0, currency),
    };
    const subjectTemplate = template.data?.subject?.trim() || messages["admin.email.kind.event"][lang];
    const bodyTemplate = template.data?.body ?? "";
    const buttonTemplate = template.data?.button_label?.trim() || translate(lang, "email.vote.open");
    const replyTo = integration.data.configured_account_email?.trim() || undefined;
    const from = fromEmail.includes("<") ? fromEmail : `${brand.name} <${fromEmail}>`;
    const systemLink = `${getSiteUrl()}${eventHref("/dashboard", event.id)}`;

    const members = await client.from("team_members").select("user_id").eq("team_id", teamId);
    if (members.error || !members.data?.length) return;
    let userIds = members.data.map((row) => row.user_id);
    if (event.subteamId) {
      const grouped = await client.from("team_member_subteams").select("user_id").eq("team_id", teamId).eq("subteam_id", event.subteamId);
      if (grouped.error) return;
      const allowed = new Set((grouped.data ?? []).map((row) => row.user_id));
      userIds = userIds.filter((id) => allowed.has(id));
    }
    if (!userIds.length) return;
    const people = await client.from("users").select("id, email, first_name, last_name, name").in("id", userIds);
    if (people.error || !people.data) return;

    await Promise.allSettled(
      people.data
        .filter((person) => Boolean(person.email?.trim()))
        .map(async (person) => {
          const token = randomBytes(32).toString("hex");
          const tokenHash = createHash("sha256").update(token).digest("hex");
          const saved = await client.from("event_vote_links").upsert(
            {
              token_hash: tokenHash,
              team_id: teamId,
              event_id: event.id,
              user_id: person.id,
              created_at: new Date().toISOString(),
            },
            { onConflict: "event_id,user_id" },
          );
          if (saved.error) return;
          const links = voteLinks(token);
          const filled = { ...params, name: personName(person) };
          const subject = plainDash(fillEmailText(subjectTemplate, filled));
          const html = buildEmailHtml({
            systemName: brand.name,
            eyebrow: translate(lang, "admin.email.kind.event"),
            heading: subject,
            bodyText: fillEmailText(bodyTemplate, filled),
            buttonLabel: fillEmailText(buttonTemplate, filled),
            actionLink: systemLink,
            footerHint: translate(lang, "admin.email.footer"),
            language: lang,
            card: {
              label: translate(lang, "admin.users.team"),
              title: params.team,
              detail: `${params.date} ${params.time}\n${params.type}\n${params.venue}`,
            },
            vote: {
              hint: translate(lang, "email.vote.hint"),
              goingLabel: translate(lang, "email.vote.going"),
              goingLink: links.going,
              absentLabel: translate(lang, "email.vote.absent"),
              absentLink: links.absent,
            },
          });
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from,
              to: [person.email.trim()],
              subject,
              html,
              reply_to: replyTo,
            }),
          });
          if (!response.ok) console.error("event email send failed", response.status);
        }),
    );
  } catch {
    console.error("event email failed");
  }
}

export async function voteFromEmailLink(token: string, choice: string): Promise<EmailVoteResult> {
  const dashboardUrl = `${getSiteUrl()}/dashboard`;
  const empty: EmailVoteResult = { state: "invalid", current: null, summary: "", lang: "lv", dashboardUrl };
  if (choice !== "going" && choice !== "absent") return empty;
  if (!/^[a-f0-9]{64}$/i.test(token)) return empty;
  const client = createAdminClient();
  if (!client) return { ...empty, state: "error" };
  const tokenHash = createHash("sha256").update(token.toLowerCase()).digest("hex");
  const link = await client.from("event_vote_links").select("team_id, event_id, user_id, expires_at").eq("token_hash", tokenHash).maybeSingle();
  if (link.error || !link.data) return empty;
  if (link.data.expires_at && new Date(link.data.expires_at).getTime() < Date.now()) return { ...empty, state: "invalid" };

  const [eventRow, teamRow, language] = await Promise.all([
    client.from("team_events").select("id, event_date, start_time, event_type, venue_id, subteam_id").eq("id", link.data.event_id).eq("team_id", link.data.team_id).maybeSingle(),
    client.from("teams").select("training_voting_hours, game_voting_hours").eq("id", link.data.team_id).maybeSingle(),
    client.from("site_languages").select("code").eq("is_default", true).maybeSingle(),
  ]);
  const pageLang = mailLang(language.data?.code);
  if (!eventRow.data || !teamRow.data) return { ...empty, lang: pageLang };
  const brand = await getSiteBrand();
  const venue = await client.from("venues").select("name").eq("id", eventRow.data.venue_id).maybeSingle();
  const votingEvent: TeamEvent = {
    id: eventRow.data.id,
    date: String(eventRow.data.event_date).slice(0, 10),
    start: String(eventRow.data.start_time).slice(0, 5),
    end: "",
    type: eventRow.data.event_type === "game" ? "game" : "training",
    titleId: "",
    subteamId: eventRow.data.subteam_id ?? "",
    venueId: eventRow.data.venue_id,
  };
  const typeLabel = translate(pageLang, votingEvent.type === "game" ? "legend.game" : "legend.training");
  const summary = [typeLabel, `${formatDisplayDate(votingEvent.date, brand.display)} ${formatClock(votingEvent.start, brand.display.timeFormat)}`, venue.data?.name?.trim() || ""]
    .filter(Boolean)
    .join(", ");
  const base = { lang: pageLang, summary, dashboardUrl, current: null as EmailVoteResult["current"] };

  const open = eventVotingOpen(
    votingEvent,
    teamRow.data.training_voting_hours ?? DEFAULT_TRAINING_VOTING_HOURS,
    teamRow.data.game_voting_hours ?? DEFAULT_GAME_VOTING_HOURS,
  );
  if (!open) {
    const existing = await client.from("team_event_rsvps").select("status").eq("event_id", link.data.event_id).eq("user_id", link.data.user_id).maybeSingle();
    const current = existing.data?.status === "going" || existing.data?.status === "absent" ? existing.data.status : "pending";
    return { ...base, state: "closed", current };
  }

  const saved = await castMemberVote(client, {
    teamId: link.data.team_id,
    eventId: link.data.event_id,
    userId: link.data.user_id,
    status: choice,
    actorId: link.data.user_id,
    enforceDeadline: true,
  });
  if (!saved.ok) {
    if (saved.error === "event.vote.closed") return { ...base, state: "closed", current: "pending" };
    return { ...base, state: "error" };
  }
  refreshTeamData();
  return { ...base, state: choice, current: choice };
}
