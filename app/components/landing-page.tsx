"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { previewEvents, type PreviewEvent } from "@/app/lib/landing-preview";
import { LANDING_FAQ } from "@/app/lib/landing-faq";
import { sendContactMessage } from "@/app/lib/contact/actions";
import { publicPath, type PublicLocale } from "@/app/lib/seo-slugs";
import { formatMonthTitle, isoDate, weekdayHeaders } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { landingSectionFromSlug, landingSlug, scrollToLandingSection } from "@/app/lib/landing-sections";
import type { MessageKey } from "@/app/lib/messages";
import { useSiteBrand } from "@/app/components/site-brand-provider";

function ogLocale(lang: string): string {
  if (lang === "en") return "en_US";
  if (lang === "ru") return "ru_RU";
  return "lv_LV";
}

function setHeadMeta(name: string, content: string, attr: "name" | "property" = "name") {
  const selector = `meta[${attr}="${name}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function LandingSeo() {
  const { formatLang, t } = useLanguage();
  const brand = useSiteBrand();

  useEffect(() => {
    const title = t("landing.seo.title");
    const description = t("landing.seo.description");
    document.title = title;
    setHeadMeta("description", description);
    setHeadMeta("og:title", title, "property");
    setHeadMeta("og:description", description, "property");
    setHeadMeta("og:locale", ogLocale(formatLang), "property");
    setHeadMeta("twitter:title", title);
    setHeadMeta("twitter:description", description);

    const script = document.getElementById("landing-jsonld");
    if (!script?.textContent) return;
    try {
      const data = JSON.parse(script.textContent) as { "@graph"?: Array<Record<string, unknown>> };
      const shown = brand.name.trim().toLowerCase() === "1equal" ? "1Equal" : brand.name;
      for (const item of data["@graph"] ?? []) {
        if (item["@type"] === "WebPage") {
          item.inLanguage = formatLang;
          item.name = title;
          item.description = description;
        }
        if (item["@type"] === "WebSite") item.description = description;
        if (item["@type"] === "WebSite" || item["@type"] === "Organization" || item["@type"] === "SoftwareApplication") item.name = shown;
      }
      script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
    } catch {
      return;
    }
  }, [brand.name, formatLang, t]);

  return null;
}

export function LandingPage({ embedded = false }: { embedded?: boolean }) {
  const { formatLang, t } = useLanguage();
  const contentSlug = landingSlug(formatLang, "content");
  const openedHash = useRef(false);

  useLayoutEffect(() => {
    const raw = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!raw) return;
    const section = landingSectionFromSlug(raw);
    const id = section ? landingSlug(formatLang, section) : raw;
    if (!openedHash.current) {
      openedHash.current = true;
      scrollToLandingSection(formatLang, raw, (id) => {
        if (id !== raw) window.history.replaceState(null, "", `#${id}`);
      });
      return;
    }
    if (id !== raw) window.history.replaceState(null, "", `#${id}`);
  }, [formatLang]);

  return (
    <div className="min-h-screen bg-ice text-ink">
      {embedded ? null : <LandingSeo />}
      <a
        href={`#${contentSlug}`}
        onClick={(event) => {
          event.preventDefault();
          scrollToLandingSection(formatLang, contentSlug, (id) => {
            window.history.pushState(null, "", `#${id}`);
          });
        }}
        className="sr-only cursor-pointer rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        {t("landing.skip")}
      </a>
      <SiteHeader />

      <main id={contentSlug}>
        <section className="relative overflow-hidden" aria-labelledby="hero-title">
          <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-train-soft blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-16">
            <div>
              <h1 id="hero-title" className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                {t("landing.hero.title")}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{t("landing.hero.lead")}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="cursor-pointer rounded-lg bg-navy px-5 py-3 text-sm font-medium text-white hover:bg-navy/90">
                  {t("auth.signup.title")}
                </Link>
                <Link href="/demo" className="cursor-pointer rounded-lg bg-paper px-5 py-3 text-sm font-medium ring-1 ring-line hover:bg-white">
                  {t("landing.hero.demo")}
                </Link>
              </div>
            </div>
            {/* TODO: replace this calendar mock with a real screenshot via next/image (priority, width 1200, height 750, alt landing.preview.alt). */}
            <div className="w-full" style={{ minHeight: 420 }}>
              <ProductPreview />
            </div>
          </div>
        </section>

        <AudienceSection />
        <ProofSection />
        <EverydaySection />

        <section id={landingSlug(formatLang, "features")} aria-labelledby="features-title" className="scroll-mt-20 border-t border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 id="features-title" className="text-2xl font-semibold tracking-tight">
              {t("landing.features.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted">{t("landing.features.lead")}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Feature icon={<IconCalendar />} title={t("landing.feature.calendar.title")} text={t("landing.feature.calendar.text")} />
              <Feature icon={<IconUsers />} title={t("landing.feature.team.title")} text={t("landing.feature.team.text")} />
              <Feature icon={<IconMail />} title={t("landing.feature.invite.title")} text={t("landing.feature.invite.text")} />
              <Feature icon={<IconCheck />} title={t("landing.feature.vote.title")} text={t("landing.feature.vote.text")} />
              <Feature icon={<IconCoin />} title={t("landing.feature.money.title")} text={t("landing.feature.money.text")} />
              <Feature icon={<IconPin />} title={t("landing.feature.venues.title")} text={t("landing.feature.venues.text")} />
            </div>
          </div>
        </section>

        <section id={landingSlug(formatLang, "advantages")} aria-labelledby="advantages-title" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 id="advantages-title" className="text-2xl font-semibold tracking-tight">
              {t("landing.advantages.title")}
            </h2>
            <p className="mt-2 text-muted">{t("landing.advantages.lead")}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Advantage icon={<IconPanel />} title={t("landing.advantage.panel.title")} text={t("landing.advantage.panel.text")} />
              <Advantage icon={<IconTrophy />} title={t("landing.advantage.subteams.title")} text={t("landing.advantage.subteams.text")} />
              <Advantage icon={<IconShield />} title={t("landing.advantage.roles.title")} text={t("landing.advantage.roles.text")} />
              <Advantage icon={<IconChart />} title={t("landing.advantage.reports.title")} text={t("landing.advantage.reports.text")} />
              <Advantage icon={<IconRocket />} title={t("landing.advantage.attendance.title")} text={t("landing.advantage.attendance.text")} />
              <Advantage icon={<IconDevice />} title={t("landing.advantage.devices.title")} text={t("landing.advantage.devices.text")} />
            </div>
          </div>
        </section>

        <section id={landingSlug(formatLang, "how")} aria-labelledby="steps-title" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 id="steps-title" className="text-2xl font-semibold tracking-tight">
              {t("landing.steps.title")}
            </h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              <Step n="01" title={t("landing.step.1.title")} text={t("landing.step.1.text")} />
              <Step n="02" title={t("landing.step.2.title")} text={t("landing.step.2.text")} />
              <Step n="03" title={t("landing.step.3.title")} text={t("landing.step.3.text")} />
            </ol>
          </div>
        </section>

        <FaqSection />

        <ContactSection />

        <section aria-labelledby="cta-title" className="px-5 pt-8 pb-12 sm:px-8 sm:pt-10">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 rounded-3xl bg-navy px-6 py-10 text-white sm:px-10">
            <h2 id="cta-title" className="text-2xl font-semibold tracking-tight">
              {t("landing.cta.title")}
            </h2>
            <p className="max-w-xl text-white/80">{t("landing.cta.text")}</p>
            <Link href="/signup" className="cursor-pointer rounded-lg bg-paper px-5 py-3 text-sm font-medium text-navy hover:bg-ice">
              {t("auth.signup.title")}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl bg-ice p-5">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-paper text-train ring-1 ring-line">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
    </article>
  );
}

function Advantage({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl bg-paper p-5 ring-1 ring-line">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ice text-train">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
    </article>
  );
}

const FAQ = LANDING_FAQ;

const TOPIC_LINKS: { slug: string; label: MessageKey }[] = [
  { slug: "sports-team-management", label: "landing.link.management" },
  { slug: "team-calendar", label: "landing.link.calendar" },
  { slug: "training-management", label: "landing.link.training" },
  { slug: "player-attendance", label: "landing.link.attendance" },
  { slug: "team-expenses", label: "landing.link.expenses" },
];

const SPORT_LINKS: { slug: string; label: MessageKey }[] = [
  { slug: "football-team-management", label: "landing.sport.football" },
  { slug: "hokeja-komandas", label: "landing.sport.hockey" },
  { slug: "basketbola-komandas", label: "landing.sport.basketball" },
  { slug: "florbola-komandas", label: "landing.sport.floorball" },
  { slug: "volejbola-komandas", label: "landing.sport.volleyball" },
];

const AUDIENCE: { slug: string; title: MessageKey; text: MessageKey }[] = [
  { slug: "hokeja-komandas", title: "landing.audience.hockey", text: "landing.audience.hockey.text" },
  { slug: "florbola-komandas", title: "landing.audience.floorball", text: "landing.audience.floorball.text" },
  { slug: "basketbola-komandas", title: "landing.audience.basketball", text: "landing.audience.basketball.text" },
  { slug: "volejbola-komandas", title: "landing.audience.volleyball", text: "landing.audience.volleyball.text" },
];

function AudienceSection() {
  const { formatLang, t } = useLanguage();
  const lang = formatLang as PublicLocale;
  return (
    <section id="audience" aria-labelledby="audience-title" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 id="audience-title" className="text-2xl font-semibold tracking-tight">
          {t("landing.audience.title")}
        </h2>
        <p className="mt-4 max-w-3xl leading-7 text-muted">{t("landing.audience.lead")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {AUDIENCE.map((item) => (
            <article key={item.slug} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
              <h3 className="font-semibold">
                <Link href={publicPath(lang, `/${item.slug}`)} className="cursor-pointer hover:underline">
                  {t(item.title)}
                </Link>
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{t(item.text)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofSection() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="proof-title" className="border-t border-line bg-paper">
      {/* TODO: replace with real figures and a team name after written permission. Do not invent counts. */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 id="proof-title" className="text-lg font-semibold">
          {t("landing.proof.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("landing.proof.text")}</p>
      </div>
    </section>
  );
}

function EverydaySection() {
  const { formatLang, t } = useLanguage();
  return (
    <section id="everyday" aria-labelledby="everyday-title" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 id="everyday-title" className="text-2xl font-semibold tracking-tight">
          {t("landing.everyday.title")}
        </h2>
        <p className="mt-4 max-w-3xl leading-7 text-muted">{t("landing.everyday.text")}</p>
        <p className="mt-4 max-w-3xl leading-7 text-muted">{t("landing.everyday.sports")}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {SPORT_LINKS.map((item) => (
            <li key={item.slug}>
              <Link href={publicPath(formatLang as PublicLocale, `/${item.slug}`)} className="cursor-pointer font-medium text-navy hover:underline">
                {t(item.label)}
              </Link>
            </li>
          ))}
        </ul>
        <h3 className="mt-8 text-lg font-semibold">{t("landing.everyday.links")}</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {TOPIC_LINKS.map((item) => (
            <li key={item.label}>
              <Link href={publicPath(formatLang as PublicLocale, `/${item.slug}`)} className="cursor-pointer font-medium text-navy hover:underline">
                {t(item.label)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ContactSection() {
  const { formatLang, t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const form = event.currentTarget;
    const result = await sendContactMessage(new FormData(form));
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    form.reset();
    showFeedback({ message: t("landing.contact.sent"), variant: "success" });
  }

  return (
    <section id={landingSlug(formatLang, "contact")} aria-labelledby="contact-title" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-xl px-4 py-12">
        <h2 id="contact-title" className="text-2xl font-semibold tracking-tight">
          {t("landing.contact.title")}
        </h2>
        <p className="mt-2 text-muted">{t("landing.contact.lead")}</p>
        <form className="mt-8 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute h-0 w-0 opacity-0" />
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              {t("landing.contact.name")}
              <input required name="name" maxLength={80} autoComplete="name" className="h-11 w-full rounded-lg bg-paper px-3 text-sm font-normal ring-1 ring-line" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              {t("auth.email")}
              <input required name="email" type="email" maxLength={200} autoComplete="email" className="h-11 w-full rounded-lg bg-paper px-3 text-sm font-normal ring-1 ring-line" />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            {t("admin.email.subject")}
            <input required name="subject" maxLength={120} className="h-11 w-full rounded-lg bg-paper px-3 text-sm font-normal ring-1 ring-line" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            {t("landing.contact.message")}
            <textarea required name="message" rows={5} maxLength={2000} className="rounded-lg bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line" />
          </label>
          <button type="submit" disabled={pending} className="justify-self-start rounded-lg bg-navy px-5 py-3 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
            {t("landing.contact.send")}
          </button>
          <p className="text-sm text-muted">
            {t("landing.contact.privacy")}{" "}
            <Link href={publicPath(formatLang as PublicLocale, "/privacy")} className="cursor-pointer font-medium text-navy hover:underline">
              {t("legal.privacy")}
            </Link>
            .
          </p>
        </form>
      </div>
    </section>
  );
}

function FaqSection() {
  const { formatLang, t } = useLanguage();
  const items = FAQ.map((item) => ({ q: t(item.q), a: t(item.a) }));

  return (
    <section id={landingSlug(formatLang, "faq")} aria-labelledby="faq-title" className="scroll-mt-20 border-t border-line bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h2 id="faq-title" className="text-2xl font-semibold tracking-tight">
          {t("landing.faq.title")}
        </h2>
        <p className="mt-2 text-muted">{t("landing.faq.lead")}</p>
        <div className="mt-8 grid gap-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-2xl bg-ice ring-1 ring-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="text-xl leading-none text-muted group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-6 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="rounded-2xl bg-paper p-5 ring-1 ring-line">
      <p className="text-sm font-semibold text-train">{n}</p>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
    </li>
  );
}

function ProductPreview() {
  const { formatLang, t } = useLanguage();
  const days = weekdayHeaders(formatLang);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = isoDate(now);
  const cells = previewMonth(year, month);
  const nextGame = previewEvents().find((event) => event.type === "game" && event.date >= today);
  const nextPlace = nextGame?.area ?? "";

  return (
    <div role="img" aria-label={t("landing.preview.alt")} className="rounded-3xl bg-paper p-4 shadow-[0_24px_60px_-28px_rgba(16,36,51,0.55)] ring-1 ring-line sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-base font-semibold">{formatMonthTitle(year, month, formatLang)}</p>
        <div className="flex gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-game" />
            {t("legend.game")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-train" />
            {t("legend.training")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-grid text-center">
        {days.map((day) => (
          <div key={day} className="border-b border-grid bg-[#f4f7fa] px-1 py-2 text-xs font-medium text-muted">
            {day}
          </div>
        ))}
        {cells.map((cell) => (
          <div key={cell.iso} className="min-h-12 border-t border-grid px-0.5 py-1 text-left sm:min-h-14 sm:px-1">
            <p className={`text-xs ${cell.muted ? "text-muted" : "font-medium"}`}>{cell.day}</p>
            {cell.events.map((event) => (
              <p
                key={event.id}
                className={`mt-1 rounded border-l-2 px-0.5 text-[10px] leading-4 tabular-nums max-[499px]:text-[9px] max-[499px]:leading-3 ${
                  event.type === "game" ? "border-game bg-game-soft text-game" : "border-train bg-train-soft text-train"
                }`}
              >
                {event.start}
              </p>
            ))}
          </div>
        ))}
      </div>
      {nextGame ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-ice px-4 py-3">
          <div>
            <p className="text-xs text-muted">{t("landing.preview.next")}</p>
            <p className="text-sm font-semibold">
              {nextPlace}, {nextGame.start}
            </p>
          </div>
          <span className="rounded-lg bg-game-soft px-2.5 py-1 text-xs font-medium text-game">{t("legend.game")}</span>
        </div>
      ) : null}
    </div>
  );
}

function previewMonth(year: number, month: number): { iso: string; day: number; muted: boolean; events: Pick<PreviewEvent, "id" | "start" | "type">[] }[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
  const last = new Date(year, month + 1, 0);
  const end = new Date(year, month + 1, (6 - ((last.getDay() + 6) % 7)) % 7);
  const cells = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const iso = isoDate(cursor);
    cells.push({
      iso,
      day: cursor.getDate(),
      muted: cursor.getMonth() !== month,
      events: previewEvents().filter((event) => event.date === iso).map((event) => ({
        id: event.id,
        start: event.start,
        type: event.type,
      })),
    });
  }
  return cells;
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c.6-3 2.8-4.5 6-4.5s5.4 1.5 6 4.5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M17 14.5c2.2.3 3.7 1.5 4.2 4" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </svg>
  );
}

function IconPanel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 14v3M9 20h6" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V6l8-3z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15l4-5 3 3 5-7" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 4c3 1 5 4 6 7-3 1-6 1-8 0-1-2-1-5 2-7z" />
      <path d="M10 11l-5 5M8 14l-2 4 4-2M9 9h.01" />
    </svg>
  );
}

function IconDevice() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}
