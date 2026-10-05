"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { buildEmailHtml, fillEmailText, plainDash } from "@/app/lib/email/build-email-html";
import { useLanguage } from "@/app/lib/language";
import { asLang, translate, type Lang, type MessageKey } from "@/app/lib/messages";
import { saveEmailTemplates } from "@/app/lib/site-admin/actions";
import { EMAIL_KINDS, type EmailKind, type EmailTemplate, type SiteLanguage } from "@/app/lib/site-admin/types";

const KIND_LABEL: Record<EmailKind, MessageKey> = {
  signup: "admin.email.kind.signup",
  password_reset: "admin.email.kind.password_reset",
  invite: "admin.email.kind.invite",
  guest: "admin.email.kind.guest",
  event: "admin.email.kind.event",
  delete_confirm: "admin.email.kind.delete_confirm",
  delete_started: "admin.email.kind.delete_started",
  delete_done: "admin.email.kind.delete_done",
};

const PREVIEW_LINK = "https://example.com/join";

function previewParams(lang: Lang, system: string) {
  const name = lang === "ru" ? "Игрок" : lang === "en" ? "Player" : "Lietotājs";
  const team = lang === "ru" ? "Команда" : lang === "en" ? "Team" : "Komanda";
  return {
    name,
    team,
    title: lang === "ru" ? "Событие" : lang === "en" ? "Event" : "Notikums",
    inviter: lang === "ru" ? "Тренер" : lang === "en" ? "Coach" : "Vadītājs",
    link: PREVIEW_LINK,
    date: "30.09.2026",
    time: "19:30",
    type: translate(lang, "legend.training"),
    venue: lang === "ru" ? "Спортивный зал Volvo" : lang === "en" ? "Volvo sports hall" : "Volvo sporta halle",
    price: "€ 90.00",
    system,
  };
}

function cloneTemplates(templates: EmailTemplate[]): EmailTemplate[] {
  return templates.map((template) => ({
    kind: template.kind,
    subjects: { ...template.subjects },
    bodies: { ...template.bodies },
    buttons: { ...template.buttons },
  }));
}

function sameTemplates(left: EmailTemplate[], right: EmailTemplate[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function AdminEmailDesign({
  systemName,
  resendEnabled,
  languages,
  initialTemplates,
}: {
  systemName: string;
  resendEnabled: boolean;
  languages: SiteLanguage[];
  initialTemplates: EmailTemplate[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [templates, setTemplates] = useState(() => cloneTemplates(initialTemplates));
  const [saved, setSaved] = useState(() => cloneTemplates(initialTemplates));
  const [kind, setKind] = useState<EmailKind>("signup");
  const [languageCode, setLanguageCode] = useState(languages.find((item) => item.isDefault)?.code ?? languages[0]?.code ?? "lv");
  const [pending, setPending] = useState(false);
  const dirty = !sameTemplates(templates, saved);
  const active = templates.find((template) => template.kind === kind) ?? templates[0];
  const language = languages.find((item) => item.code === languageCode) ?? languages[0];

  const preview = useMemo(() => {
    if (!active || !language) return { subject: "", html: "" };
    const mailLang = asLang(language.code);
    const params = previewParams(mailLang, systemName);
    const subject = plainDash(fillEmailText(active.subjects[language.code] ?? "", params));
    const body = plainDash(fillEmailText(active.bodies[language.code] ?? "", params));
    const button = plainDash(fillEmailText(active.buttons[language.code] ?? "", params));
    const card = kind === "invite"
      ? { label: translate(mailLang, "admin.users.team"), title: params.team, detail: translate(mailLang, "email.invite.by", { name: params.inviter }) }
      : kind === "guest" || kind === "event"
        ? { label: translate(mailLang, "admin.users.team"), title: params.team, detail: `${params.date} ${params.time}\n${params.type}\n${params.venue}` }
        : undefined;
    const actionLink = kind === "guest" ? "https://example.com/training/preview" : params.link;
    return {
      subject,
      html: buildEmailHtml({
        systemName,
        eyebrow: translate(mailLang, KIND_LABEL[kind]),
        heading: subject || systemName,
        bodyText: body,
        buttonLabel: button,
        actionLink,
        footerHint: translate(mailLang, kind.startsWith("delete_") ? "user.delete.mail_footer" : "admin.email.footer"),
        tagline: language.slogan,
        language: mailLang,
        card,
        vote: kind === "event"
          ? {
              hint: translate(mailLang, "email.vote.hint"),
              goingLabel: translate(mailLang, "email.vote.going"),
              goingLink: "https://example.com/v/preview/going",
              absentLabel: translate(mailLang, "email.vote.absent"),
              absentLink: "https://example.com/v/preview/absent",
            }
          : undefined,
      }),
    };
  }, [active, kind, language, systemName]);

  function update(part: "subjects" | "bodies" | "buttons", value: string) {
    if (!language) return;
    setTemplates((current) =>
      current.map((template) =>
        template.kind === kind ? { ...template, [part]: { ...template[part], [language.code]: value } } : template,
      ),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || pending) return;
    setPending(true);
    const result = await saveEmailTemplates(templates);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    const next = cloneTemplates(templates);
    setTemplates(next);
    setSaved(cloneTemplates(next));
    showFeedback({ message: t("admin.email.saved"), variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {resendEnabled ? null : (
        <p className="rounded-2xl bg-game-soft px-4 py-3 text-sm text-ink ring-1 ring-line">
          {t("admin.email.resend_off")}{" "}
          <button type="button" className="font-semibold underline" onClick={() => router.push("/dashboard/admin/integrations")}>
            {t("nav.admin.integrations")}
          </button>
        </p>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4 rounded-2xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm leading-6 text-muted">{t("admin.email.lead")}</p>
          <div className="flex flex-wrap gap-2">
            {EMAIL_KINDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${kind === item ? "bg-navy text-white" : "bg-ice text-ink"}`}
              >
                {t(KIND_LABEL[item])}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("admin.email.language")}>
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={item.code === languageCode}
                onClick={() => setLanguageCode(item.code)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${item.code === languageCode ? "bg-navy text-white" : "bg-ice text-ink"}`}
              >
                {item.name}
              </button>
            ))}
          </div>
          {kind === "guest" ? <p className="text-sm leading-6 text-muted">{t("admin.email.guest_note")}</p> : null}
          {kind === "event" ? <p className="text-sm leading-6 text-muted">{t("admin.email.event_note")}</p> : null}
          {kind.startsWith("delete_") ? <p className="text-sm leading-6 text-muted">{t("admin.email.delete_note")}</p> : null}
          {active && language ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                {t("admin.email.subject")}
                <input
                  value={active.subjects[language.code] ?? ""}
                  onChange={(event) => update("subjects", event.target.value)}
                  className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("admin.email.body")}
                <textarea
                  value={active.bodies[language.code] ?? ""}
                  rows={7}
                  onChange={(event) => update("bodies", event.target.value)}
                  className="mt-2 w-full resize-y rounded-xl bg-paper px-3 py-2 font-mono text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("admin.email.button")}
                <input
                  value={active.buttons[language.code] ?? ""}
                  onChange={(event) => update("buttons", event.target.value)}
                  className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
                />
              </label>
            </div>
          ) : null}
          <div className="flex justify-end border-t border-line pt-4">
            <button type="submit" disabled={!dirty || pending} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
              {t("actions.save")}
            </button>
          </div>
        </form>
        <aside className="rounded-2xl bg-paper p-5 ring-1 ring-line">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t("admin.email.preview")}</p>
          <p className="mt-3 text-sm font-semibold">{preview.subject || "-"}</p>
          <iframe title={t("admin.email.preview")} srcDoc={preview.html} sandbox="" className="mt-3 h-[640px] w-full rounded-xl bg-ice ring-1 ring-line" />
        </aside>
      </div>
    </div>
  );
}
