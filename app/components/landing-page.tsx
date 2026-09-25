"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/app/components/site-header";
import { EVENTS, VENUES, type EventType } from "@/app/lib/demo-data";
import { isoDate } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

export function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-ice text-ink">
      <a
        href="#saturs"
        className="sr-only cursor-pointer rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        {t("landing.skip")}
      </a>
      <SiteHeader />

      <main id="saturs">
        <section className="relative overflow-hidden" aria-labelledby="hero-title">
          <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-train-soft blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-24">
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
            <ProductPreview />
          </div>
        </section>

        <section id="iespejas" aria-labelledby="features-title" className="scroll-mt-20 border-t border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 id="features-title" className="text-2xl font-semibold tracking-tight">
              {t("landing.features.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted">{t("landing.features.lead")}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Feature icon={<IconCalendar />} title={t("landing.feature.calendar.title")} text={t("landing.feature.calendar.text")} />
              <Feature icon={<IconUsers />} title={t("landing.feature.team.title")} text={t("landing.feature.team.text")} />
              <Feature icon={<IconCoin />} title={t("landing.feature.money.title")} text={t("landing.feature.money.text")} />
              <Feature icon={<IconPin />} title={t("landing.feature.venues.title")} text={t("landing.feature.venues.text")} />
            </div>
          </div>
        </section>

        <section id="prieksrocibas" aria-labelledby="advantages-title" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16">
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

        <section id="soli" aria-labelledby="steps-title" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16">
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

        <section aria-labelledby="cta-title" className="px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
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

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <p className="font-medium text-ink">1equal</p>
          <nav aria-label={t("landing.footer.account")} className="flex gap-4">
            <Link href="/login" className="cursor-pointer hover:text-ink">
              {t("auth.login.title")}
            </Link>
            <Link href="/signup" className="cursor-pointer hover:text-ink">
              {t("auth.signup.nav")}
            </Link>
          </nav>
        </div>
      </footer>
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

const FAQ: { q: MessageKey; a: MessageKey }[] = [
  { q: "landing.faq.1.q", a: "landing.faq.1.a" },
  { q: "landing.faq.2.q", a: "landing.faq.2.a" },
  { q: "landing.faq.3.q", a: "landing.faq.3.a" },
  { q: "landing.faq.4.q", a: "landing.faq.4.a" },
  { q: "landing.faq.5.q", a: "landing.faq.5.a" },
];

function FaqSection() {
  const { t } = useLanguage();
  const items = FAQ.map((item) => ({ q: t(item.q), a: t(item.a) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section id="jautajumi" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-line bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-3xl px-4 py-16">
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
  const { lang, t } = useLanguage();
  const days = lang === "lv" ? ["Pr", "Ot", "Tr", "Ce", "Pk", "Se", "Sv"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const year = 2026;
  const month = 8;
  const cells = previewMonth(year, month);
  const nextGame = EVENTS.find((event) => event.date.startsWith("2026-09") && event.type === "game");
  const nextPlace = VENUES.find((venue) => venue.id === nextGame?.venueId)?.area.split(",")[0] ?? "";

  return (
    <div aria-hidden="true" className="rounded-3xl bg-paper p-4 shadow-[0_24px_60px_-28px_rgba(16,36,51,0.55)] ring-1 ring-line sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-base font-semibold">{t("landing.preview.month")}</p>
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

function previewMonth(year: number, month: number): { iso: string; day: number; muted: boolean; events: { id: string; start: string; type: EventType }[] }[] {
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
      events: EVENTS.filter((event) => event.date === iso).map((event) => ({
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

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}
