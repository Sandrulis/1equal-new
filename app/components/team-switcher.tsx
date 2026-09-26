"use client";

import { useEffect, useRef, useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { TeamMark } from "@/app/components/team-mark";
import { teamNamesMatch } from "@/app/lib/ehl-team";
import { lookupEhlTeamName } from "@/app/lib/ehl-team-lookup";
import type { IssuedTeam } from "@/app/lib/invite-code";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { readPlayerHintDismissed, writePlayerHintDismissed } from "@/app/lib/player-hint-cookie";

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
}: {
  team: Pick<IssuedTeam, "name" | "code" | "logoUrl"> | null;
  teams: IssuedTeam[];
  canSwitch: boolean;
  onHome: () => void;
  onSelect: (code: string) => void;
  onCreate: (name: string, sourceUrl: string | null, logoUrl: string | null) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [wide, setWide] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 600px)");
    function sync() {
      setWide(query.matches);
      if (!query.matches) setOpen(false);
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
      <button
        type="button"
        aria-label={team.name}
        aria-expanded={canSwitch && wide ? open : undefined}
        aria-haspopup={canSwitch && wide ? "menu" : undefined}
        onClick={activate}
        className="flex min-w-0 items-center gap-2.5 rounded-lg hover:bg-ice"
      >
        <TeamMark name={team.name} logoUrl={team.logoUrl} className="h-9 w-9 shrink-0 overflow-hidden rounded-lg" />
        <span className="hidden min-w-0 truncate text-base font-semibold tracking-tight min-[600px]:block">{team.name}</span>
      </button>
      {open && canSwitch && wide ? (
        <div role="menu" aria-label={t("team.switch.label")} className="absolute top-full left-0 z-40 mt-1 w-72 rounded-xl bg-paper p-1.5 ring-1 ring-line">
          {teams.map((item) => (
            <button
              key={item.code}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect(item.code);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${item.code === team.code ? "bg-ice" : "hover:bg-ice"}`}
            >
              <TeamMark name={item.name} logoUrl={item.logoUrl} className="h-8 w-8 shrink-0 overflow-hidden rounded-lg" />
              <span className="min-w-0 truncate font-medium">{item.name}</span>
            </button>
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
        onClose={() => setCreating(false)}
        onCreate={(name, sourceUrl, logoUrl) => {
          setCreating(false);
          onCreate(name, sourceUrl, logoUrl);
        }}
      />
    </div>
  );
}

export function PlayerLinkHint({ teamCode, onOpen }: { teamCode: string; onOpen: () => void }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readPlayerHintDismissed(teamCode));
  }, [teamCode]);

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
          setVisible(false);
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
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, sourceUrl: string | null, logoUrl: string | null) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [mismatch, setMismatch] = useState<{ remote: string; url: string; logoUrl: string | null } | null>(null);
  const nameReady = name.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setName("");
      setLink("");
      setMismatch(null);
    }
  }, [open]);

  async function submit() {
    if (!nameReady || pending) return;
    const source = link.trim();
    if (!source) {
      onCreate(name.trim(), null, null);
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
    onCreate(name.trim(), result.url, result.logoUrl);
  }

  return (
    <>
      <AdminDialog open={open && mismatch === null} title={t("team.switch.add")} onClose={onClose}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="text-sm font-medium">
            {t("catalog.name")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
              disabled={pending}
              className="mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm font-normal ring-1 ring-line outline-none focus:ring-train disabled:opacity-60"
            />
          </label>
          <label className="text-sm font-medium">
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
              className="mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm font-normal ring-1 ring-line outline-none placeholder:text-muted focus:ring-train disabled:opacity-60"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60">
              {t("actions.cancel")}
            </button>
            <button type="submit" disabled={!nameReady || pending} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? t("team.empty.checking") : t("team.empty.create")}
            </button>
          </div>
        </form>
      </AdminDialog>
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
              onCreate(name.trim(), url, logoUrl);
            }}
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90"
          >
            {t("team.empty.create")}
          </button>
        </div>
      </AdminDialog>
    </>
  );
}
