"use client";

import { useRef, useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { AvatarCropField, type AvatarCropHandle } from "@/app/components/avatar-crop-field";
import { MoneyVotingFields } from "@/app/components/money-voting-fields";
import { SportField } from "@/app/components/sport-switch";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { teamNamesMatch } from "@/app/lib/ehl-team";
import { votingHours, type CreateTeamInput } from "@/app/lib/team-defaults";
import { chosenSportId, type Sport } from "@/app/lib/sports";
import { lookupEhlTeamName } from "@/app/lib/ehl-team-lookup";
import { useLanguage } from "@/app/lib/language";
import { normalizeInviteCode } from "@/app/lib/invite-code";
import type { MessageKey } from "@/app/lib/messages";

const LINK_ERROR: Record<"invalid" | "not_found" | "failed", MessageKey> = {
  invalid: "team.link.invalid",
  not_found: "team.link.not_found",
  failed: "team.link.failed",
};

export function NoTeamStart({
  sports = [],
  onCreate,
  onJoin,
}: {
  sports?: Sport[];
  onCreate: (input: CreateTeamInput) => void;
  onJoin: (code: string) => void;
}) {
  const { t } = useLanguage();
  const brand = useSiteBrand();
  const { showFeedback } = useFeedbackToast();
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [currency, setCurrency] = useState<string | null>(null);
  const [trainingHours, setTrainingHours] = useState(String(brand.trainingVotingHours));
  const [gameHours, setGameHours] = useState(String(brand.gameVotingHours));
  const [sportId, setSportId] = useState("");
  const [code, setCode] = useState("");
  const avatarRef = useRef<AvatarCropHandle>(null);
  const [mismatch, setMismatch] = useState<{ remote: string; url: string; logoUrl: string | null } | null>(null);
  const nameReady = name.trim().length > 0;
  const codeReady = normalizeInviteCode(code).length > 0;
  const trainingValue = votingHours(trainingHours);
  const gameValue = votingHours(gameHours);
  const hoursOk = trainingValue != null && gameValue != null;

  async function emit(sourceUrl: string | null, logoUrl: string | null) {
    if (trainingValue == null || gameValue == null) return;
    let avatarFile: File | null = null;
    if (!sourceUrl) {
      const crop = await avatarRef.current?.result();
      if (crop?.changed && !crop.remove && !crop.file) {
        showFeedback({ message: t("avatar.error.file"), variant: "error" });
        return;
      }
      avatarFile = crop?.file ?? null;
    }
    onCreate({ name: name.trim(), sourceUrl, logoUrl, avatarFile, currency, trainingVotingHours: trainingValue, gameVotingHours: gameValue, sportId: chosenSportId(sports, sportId) });
  }

  async function submitCreate() {
    if (!nameReady || !hoursOk || pending) return;
    const source = link.trim();
    if (!source) {
      await emit(null, null);
      return;
    }
    setPending(true);
    const result = await lookupEhlTeamName(source);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(LINK_ERROR[result.error]), variant: "error" });
      return;
    }
    if (!teamNamesMatch(name, result.name)) {
      setMismatch({ remote: result.name, url: result.url, logoUrl: result.logoUrl });
      return;
    }
    await emit(result.url, result.logoUrl);
  }

  return (
    <section className="rounded-2xl bg-paper px-4 py-10 ring-1 ring-line sm:px-8 sm:py-14">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white">
          <IconUsers />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{t("team.empty.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("team.empty.lead")}</p>

        {creating ? (
          <form
            className="mt-6 flex w-full flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCreate();
            }}
          >
            <label className="text-left text-sm font-medium">
              {t("catalog.name")}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoFocus
                disabled={pending}
                className="mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm font-normal text-ink ring-1 ring-line outline-none focus:ring-train disabled:opacity-60"
              />
            </label>
            <label className="text-left text-sm font-medium">
              {t("team.empty.link")}
              <span className="ml-2 font-normal text-muted">{t("team.empty.link_optional")}</span>
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder={t("team.empty.link_placeholder")}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                disabled={pending}
              className="mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm font-normal text-ink ring-1 ring-line outline-none placeholder:text-muted focus:ring-train disabled:opacity-60"
            />
          </label>
          {link.trim() === "" ? (
            <div className="text-left">
              <AvatarCropField ref={avatarRef} disabled={pending} />
            </div>
          ) : null}
            <SportField sports={sports} value={chosenSportId(sports, sportId) ?? ""} onChange={setSportId} disabled={pending} />
            <div className="text-left">
              <MoneyVotingFields
                idPrefix="start-team"
                currency={currency}
                trainingHours={trainingHours}
                gameHours={gameHours}
                systemCurrency={brand.currency}
                allowSystemCurrency
                disabled={pending}
                onCurrency={setCurrency}
                onTrainingHours={setTrainingHours}
                onGameHours={setGameHours}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setCreating(false);
                  setName("");
                  setLink("");
                  setMismatch(null);
                }}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("actions.cancel")}
              </button>
              <button
                type="submit"
                disabled={!nameReady || !hoursOk || pending}
                className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? t("team.empty.checking") : t("team.empty.create")}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90"
          >
            <IconPlus />
            {t("team.empty.create")}
          </button>
        )}
      </div>

      <div className="mx-auto mt-10 max-w-lg border-t border-line pt-8 text-center">
        <h2 className="text-sm font-semibold">{t("team.empty.join_title")}</h2>
        <form
          className="mt-4 flex flex-col gap-2 min-[600px]:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const next = normalizeInviteCode(code);
            if (!next) return;
            onJoin(next);
          }}
        >
          <label className="sr-only" htmlFor="team-invite-code">
            {t("team.empty.code")}
          </label>
          <input
            id="team-invite-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder={t("team.empty.code")}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg bg-ice px-3 py-2.5 text-center font-mono text-sm tracking-widest text-ink ring-1 ring-line outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted focus:ring-train min-[600px]:text-left"
          />
          <button
            type="submit"
            disabled={!codeReady}
            className="shrink-0 rounded-lg bg-paper px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("team.empty.join")}
          </button>
        </form>
      </div>
      <AdminDialog
        open={mismatch !== null}
        title={t("team.name.mismatch.title")}
        lead={mismatch ? t("team.name.mismatch.lead", { remote: mismatch.remote, entered: name.trim() }) : undefined}
        onClose={() => setMismatch(null)}
      >
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setMismatch(null)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-ice">
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = mismatch?.url ?? null;
              const logoUrl = mismatch?.logoUrl ?? null;
              setMismatch(null);
              void emit(url, logoUrl);
            }}
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90"
          >
            {t("team.empty.create")}
          </button>
        </div>
      </AdminDialog>
    </section>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-2.8 2.8-4.5 5.5-4.5S14 16.2 14.5 19" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 14.6c2.2.3 3.8 1.8 4.4 4.4" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
