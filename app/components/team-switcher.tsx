"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { AvatarCropField, type AvatarCropHandle } from "@/app/components/avatar-crop-field";
import { EhlTeamLinkField, sameEhlTeam, type ResolvedEhlTeam } from "@/app/components/ehl-team-link-field";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconTipButton, IconX } from "@/app/components/icon-tip-button";
import { TeamMark } from "@/app/components/team-mark";
import { MoneyVotingFields } from "@/app/components/money-voting-fields";
const SportField = dynamic(() => import("@/app/components/sport-switch").then((mod) => mod.SportField));
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { teamNamesMatch } from "@/app/lib/ehl-team";
import { votingHours, type CreateTeamInput } from "@/app/lib/team-defaults";
import { teamLogoUrl } from "@/app/lib/entuziasti-view";
import { FRONTEND_MODULE_KEYS, entuziastiForSport } from "@/app/lib/frontend-modules";
import { chosenSportId, type Sport } from "@/app/lib/sports";
import { lookupEhlTeamName } from "@/app/lib/ehl-team-lookup";
import type { IssuedTeam } from "@/app/lib/invite-code";
import { useLanguage } from "@/app/lib/language";
import { claimMobileMenu, releaseMobileMenu, useExclusiveMobileMenu } from "@/app/lib/mobile-menu";
import type { MessageKey } from "@/app/lib/messages";
import { readPlayerHintDismissed, subscribePlayerHint, writePlayerHintDismissed } from "@/app/lib/player-hint-cookie";

const LINK_ERROR: Record<"invalid" | "not_found" | "failed", MessageKey> = {
  invalid: "team.link.invalid",
  not_found: "team.link.not_found",
  failed: "team.link.failed",
};

export function TeamSwitcher({
  team,
  teams,
  canSwitch,
  onHome,
  onSelect,
  onCreate,
  onUnwatch,
  sports = [],
  enabledModules = null,
  individualModuleKeys = [],
  presetEntuziasti = false,
}: {
  team: Pick<IssuedTeam, "name" | "code" | "logoUrl" | "sportId" | "moduleKeys" | "demo"> | null;
  teams: IssuedTeam[];
  canSwitch: boolean;
  onHome: () => void;
  onSelect: (code: string) => void;
  onCreate: (input: CreateTeamInput) => boolean | Promise<boolean>;
  onUnwatch?: (teamId: string) => void | Promise<void>;
  sports?: Sport[];
  enabledModules?: string[] | null;
  individualModuleKeys?: string[];
  presetEntuziasti?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  useExclusiveMobileMenu("team", open, () => setOpen(false));
  const [creating, setCreating] = useState(false);
  const [unwatchingId, setUnwatchingId] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function logoOf(item: Pick<IssuedTeam, "logoUrl" | "sportId" | "moduleKeys" | "demo">): string | null {
    const sportKeys = item.sportId ? (sports.find((sport) => sport.id === item.sportId)?.moduleKeys ?? null) : null;
    const granted = item.demo || !individualModuleKeys.includes(FRONTEND_MODULE_KEYS.entuziasti) || (item.moduleKeys ?? []).includes(FRONTEND_MODULE_KEYS.entuziasti);
    const modules = granted ? enabledModules : (enabledModules ?? []).filter((key) => key !== FRONTEND_MODULE_KEYS.entuziasti);
    return teamLogoUrl(item.logoUrl, entuziastiForSport(modules, sportKeys));
  }

  useEffect(() => {
    const query = window.matchMedia("(min-width: 600px)");
    function sync() {
      setWide(query.matches);
    }
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!team) return null;

  function activate() {
    if (canSwitch && wide) {
      setOpen((value) => !value);
      return;
    }
    onHome();
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          aria-label={team.name}
          aria-expanded={canSwitch && wide ? open : undefined}
          aria-haspopup={canSwitch && wide ? "menu" : undefined}
          onClick={activate}
          className="flex min-w-0 items-center gap-2.5 rounded-lg hover:bg-ice"
        >
          <TeamMark name={team.name} logoUrl={logoOf(team)} className="h-9 w-9 shrink-0 overflow-hidden rounded-lg" />
          <span className="hidden min-w-0 truncate text-base font-semibold tracking-tight min-[600px]:block">{team.name}</span>
        </button>
        {canSwitch && !wide ? (
          <button
            type="button"
            aria-label={t("team.switch.label")}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => {
              const next = !open;
              if (next) claimMobileMenu("team");
              else releaseMobileMenu("team");
              setOpen(next);
            }}
            className="grid h-9 w-8 shrink-0 place-items-center rounded-lg text-ink hover:bg-ice"
          >
            <IconChevronDown open={open} />
          </button>
        ) : null}
      </div>
      {open && canSwitch ? (
        <div role="menu" aria-label={t("team.switch.label")} className="absolute top-full left-0 z-40 mt-1 rounded-xl bg-paper p-1.5 ring-1 ring-line max-[599px]:fixed max-[599px]:inset-x-0 max-[599px]:top-14 max-[599px]:rounded-none min-[600px]:w-72">
          {teams.map((item) => (
            <div key={item.code} className={`flex items-center rounded-lg ${item.code === team.code ? "bg-ice" : ""}`}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelect(item.code);
                }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-ice"
              >
                <TeamMark name={item.name} logoUrl={logoOf(item)} className="h-8 w-8 shrink-0 overflow-hidden rounded-lg" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  {item.watching ? <span className="block text-xs text-muted">{t("team.watching")}</span> : null}
                </span>
              </button>
              {item.watching && item.id && onUnwatch ? (
                <IconTipButton
                  label={t("admin.teams.unwatch")}
                  tone="muted"
                  disabled={unwatchingId !== null}
                  onClick={() => {
                    const teamId = item.id;
                    if (!teamId || !onUnwatch || unwatchingId) return;
                    setOpen(false);
                    setUnwatchingId(teamId);
                    void Promise.resolve(onUnwatch(teamId)).finally(() => setUnwatchingId(null));
                  }}
                >
                  <IconX />
                </IconTipButton>
              ) : null}
            </div>
          ))}
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium hover:bg-ice"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-white">+</span>
            {t("team.switch.add")}
          </button>
        </div>
      ) : null}
      <CreateTeamDialog
        open={creating}
        sports={sports}
        enabledModules={enabledModules}
        individualModuleKeys={individualModuleKeys}
        presetEntuziasti={presetEntuziasti}
        onClose={() => setCreating(false)}
        onCreate={async (input) => {
          const ok = await onCreate(input);
          if (ok) setCreating(false);
          return ok;
        }}
      />
    </div>
  );
}

export function PlayerLinkHint({ teamCode, onOpen }: { teamCode: string; onOpen: () => void }) {
  const { t } = useLanguage();
  const visible = useSyncExternalStore(subscribePlayerHint, () => !readPlayerHintDismissed(teamCode), () => false);

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl bg-train-soft px-4 py-3 ring-1 ring-line">
      <p className="min-w-0 flex-1 text-sm leading-6">
        {t("team.player.hint")}{" "}
        <button type="button" onClick={onOpen} className="font-medium text-train">
          {t("team.player.hint_action")}
        </button>
      </p>
      <button
        type="button"
        aria-label={t("event.close")}
        onClick={() => {
          writePlayerHintDismissed(teamCode);
        }}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function CreateTeamDialog({
  open,
  sports,
  enabledModules = null,
  onClose,
  onCreate,
}: {
  open: boolean;
  sports: Sport[];
  enabledModules?: string[] | null;
  individualModuleKeys?: string[];
  presetEntuziasti?: boolean;
  onClose: () => void;
  onCreate: (input: CreateTeamInput) => boolean | Promise<boolean>;
}) {
  const { t } = useLanguage();
  const brand = useSiteBrand();
  const { showFeedback } = useFeedbackToast();
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [currency, setCurrency] = useState<string | null>(null);
  const [trainingHours, setTrainingHours] = useState(String(brand.trainingVotingHours));
  const [gameHours, setGameHours] = useState(String(brand.gameVotingHours));
  const [sportId, setSportId] = useState("");
  const [pending, setPending] = useState(false);
  const avatarRef = useRef<AvatarCropHandle>(null);
  const previewRef = useRef<ResolvedEhlTeam | null>(null);
  const busyRef = useRef(false);
  const [mismatch, setMismatch] = useState<{ remote: string; url: string; logoUrl: string | null } | null>(null);
  const nameReady = name.trim().length > 0;
  const trainingValue = votingHours(trainingHours);
  const gameValue = votingHours(gameHours);
  const hoursOk = trainingValue != null && gameValue != null;
  const pickedSport = chosenSportId(sports, sportId);
  const showLink = entuziastiForSport(enabledModules, pickedSport ? (sports.find((item) => item.id === pickedSport)?.moduleKeys ?? null) : null);
  useEffect(() => {
    if (!open) busyRef.current = false;
  }, [open]);

  const closedKey = `${open ? 1 : 0}|${brand.trainingVotingHours}|${brand.gameVotingHours}`;
  const [seenClosed, setSeenClosed] = useState(closedKey);
  if (closedKey !== seenClosed) {
    setSeenClosed(closedKey);
    if (!open) {
      setPending(false);
      setName("");
      setLink("");
      setLinkBusy(false);
      setCurrency(null);
      setTrainingHours(String(brand.trainingVotingHours));
      setGameHours(String(brand.gameVotingHours));
      setMismatch(null);
    }
  }

  async function emit(sourceUrl: string | null, logoUrl: string | null): Promise<boolean> {
    if (trainingValue == null || gameValue == null) return false;
    let avatarFile: File | null = null;
    if (!sourceUrl) {
      const crop = await avatarRef.current?.result();
      if (crop?.changed && !crop.remove && !crop.file) {
        showFeedback({ message: t("avatar.error.file"), variant: "error" });
        return false;
      }
      avatarFile = crop?.file ?? null;
    }
    return Boolean(await onCreate({ name: name.trim(), sourceUrl, logoUrl, avatarFile, currency, trainingVotingHours: trainingValue, gameVotingHours: gameValue, sportId: chosenSportId(sports, sportId) }));
  }

  async function submit() {
    if (!nameReady || !hoursOk || busyRef.current || linkBusy) return;
    busyRef.current = true;
    setPending(true);
    let hold = false;
    try {
      const source = showLink ? link.trim() : "";
      if (!source) {
        hold = await emit(null, null);
        return;
      }
      const cached = sameEhlTeam(source, previewRef.current) ? previewRef.current : null;
      let result = cached;
      if (!result) {
        const looked = await lookupEhlTeamName(source);
        if (!looked.ok) {
          showFeedback({ message: t(LINK_ERROR[looked.error]), variant: "error" });
          return;
        }
        result = looked;
      }
      if (!teamNamesMatch(name, result.name)) {
        setMismatch({ remote: result.name, url: result.url, logoUrl: result.logoUrl });
        return;
      }
      hold = await emit(result.url, result.logoUrl);
    } finally {
      if (!hold) {
        busyRef.current = false;
        setPending(false);
      }
    }
  }

  function confirmMismatch() {
    if (busyRef.current || !mismatch) return;
    const url = mismatch.url;
    const logoUrl = mismatch.logoUrl;
    setMismatch(null);
    busyRef.current = true;
    setPending(true);
    void emit(url, logoUrl).then((ok) => {
      if (ok) return;
      busyRef.current = false;
      setPending(false);
    });
  }

  return (
    <>
      <AdminDialog open={open && mismatch === null} title={t("team.switch.add")} onClose={() => { if (!pending) onClose(); }}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {showLink ? (
            <EhlTeamLinkField
              value={link}
              disabled={pending}
              autoFocus
              onChange={setLink}
              onLoading={setLinkBusy}
              onResolved={(next) => {
                previewRef.current = next;
                if (next) setName(next.name.slice(0, 80));
              }}
            />
          ) : null}
          <label className="text-sm font-medium">
            {t("catalog.name")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus={!showLink}
              disabled={pending || linkBusy}
              className="mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm font-normal ring-1 ring-line outline-none focus:ring-train disabled:opacity-60"
            />
          </label>
          {showLink && link.trim() !== "" ? null : <AvatarCropField ref={avatarRef} disabled={pending} />}
          {open ? <SportField sports={sports} value={chosenSportId(sports, sportId) ?? ""} onChange={setSportId} disabled={pending} /> : null}
          <MoneyVotingFields
            idPrefix="create-team"
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
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60">
              {t("actions.cancel")}
            </button>
            <button type="submit" disabled={!nameReady || !hoursOk || pending || linkBusy} aria-busy={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
              {pending ? t("team.empty.creating") : t("team.empty.create")}
            </button>
          </div>
        </form>
      </AdminDialog>
      <AdminDialog
        open={mismatch !== null}
        title={t("team.name.mismatch.title")}
        lead={mismatch ? t("team.name.mismatch.lead", { remote: mismatch.remote, entered: name.trim() }) : undefined}
        onClose={() => { if (!pending) setMismatch(null); }}
      >
        <div className="flex justify-end gap-2">
          <button type="button" disabled={pending} onClick={() => setMismatch(null)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60">
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={confirmMismatch}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
            {pending ? t("team.empty.creating") : t("team.empty.create")}
          </button>
        </div>
      </AdminDialog>
    </>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={open ? "rotate-180" : ""}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
