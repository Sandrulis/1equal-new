"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AvatarCropField, type AvatarCropHandle } from "@/app/components/avatar-crop-field";
import { DisplayPreferencesFields } from "@/app/components/display-preferences";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { saveUserAvatar, updateProfile } from "@/app/lib/auth/actions";
import { teamPlayer, type AccountProfile } from "@/app/lib/auth/profile";
import { userDisplayEqual, type UserDisplayPreferences } from "@/app/lib/display-preferences";
import { ContentImage } from "@/app/components/content-image";
import type { EhlPlayerProfile } from "@/app/lib/ehl-player";
import { useIsClient } from "@/app/lib/use-is-client";
import { useLanguage } from "@/app/lib/language";

export function AccountSettingsDialog({
  account,
  teamCode = null,
  teamName = null,
  onClose,
  onSaved,
}: {
  account: AccountProfile;
  teamCode?: string | null;
  teamName?: string | null;
  onClose: () => void;
  onSaved: (account: Pick<AccountProfile, "firstName" | "lastName" | "ehlPlayers" | "avatarUrl" | "display">) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const brand = useSiteBrand();
  const titleId = useId();
  const savedPlayer = teamPlayer(account, teamCode);
  const mounted = useIsClient();
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [playerUrl, setPlayerUrl] = useState(savedPlayer?.sourceUrl ?? "");
  const [display, setDisplay] = useState<UserDisplayPreferences>(account.display);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const avatarRef = useRef<AvatarCropHandle>(null);
  const savedUrl = savedPlayer?.sourceUrl ?? "";
  const hasTeam = Boolean(teamCode);
  const showAvatar = playerUrl.trim() === "";
  const dirty = firstName !== account.firstName || lastName !== account.lastName || (hasTeam && playerUrl.trim() !== savedUrl) || !userDisplayEqual(display, account.display) || (showAvatar && avatarDirty);
  const canSave = dirty && firstName.trim() !== "" && lastName.trim() !== "" && !pending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    let avatarUrl = account.avatarUrl;
    if (showAvatar) {
      const crop = await avatarRef.current?.result();
      if (crop?.changed) {
        if (!crop.remove && !crop.file) {
          showFeedback({ message: t("avatar.error.file"), variant: "error" });
          return;
        }
        const body = new FormData();
        if (crop.remove) body.set("remove", "1");
        else if (crop.file) body.set("file", crop.file);
        setPending(true);
        const uploaded = await saveUserAvatar(body);
        setPending(false);
        if (!uploaded.ok) {
          showFeedback({ message: t(uploaded.error), variant: "error" });
          return;
        }
        avatarUrl = uploaded.url;
      }
    }
    setPending(true);
    const result = await updateProfile(new FormData(event.currentTarget));
    setPending(false);
    if ("error" in result || !("ok" in result)) {
      if ("error" in result) showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    const ehlPlayers = { ...account.ehlPlayers };
    if (result.ehlPlayer !== undefined && result.teamCode) {
      if (result.ehlPlayer) ehlPlayers[result.teamCode] = result.ehlPlayer;
      else delete ehlPlayers[result.teamCode];
    }
    onSaved({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ehlPlayers,
      avatarUrl,
      display: result.display ?? display,
    });
    showFeedback({ message: t("user.settings.saved"), variant: "success" });
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <form onSubmit={(event) => void onSubmit(event)} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 ring-1 ring-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {t("user.settings")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">{t("user.settings.lead")}</p>
          </div>
          <button type="button" aria-label={t("event.close")} onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-ice hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <NameField label={t("auth.firstName")} name="firstName" value={firstName} autoComplete="given-name" onChange={setFirstName} />
          <NameField label={t("auth.lastName")} name="lastName" value={lastName} autoComplete="family-name" onChange={setLastName} />
        </div>
        {hasTeam && teamCode ? (
          <label className="mt-3 grid gap-1.5 text-sm font-medium">
            <span>
              {t("user.settings.player")}
              {teamName ? <span className="ml-2 font-normal text-muted">{teamName}</span> : null}
              <span className="ml-2 font-normal text-muted">{t("team.empty.link_optional")}</span>
            </span>
            <input type="hidden" name="teamCode" value={teamCode} />
            <input
              name="playerUrl"
              value={playerUrl}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("user.settings.player_placeholder")}
              onChange={(event) => {
                setPlayerUrl(event.target.value);
                if (event.target.value.trim()) setAvatarDirty(false);
              }}
              className="h-11 rounded-lg bg-ice px-3 text-sm font-normal ring-1 ring-line"
            />
            <span className="font-normal text-muted">{t("user.settings.player_hint")}</span>
            {savedPlayer && playerUrl.trim() === savedUrl ? <PlayerSummary player={savedPlayer} /> : null}
          </label>
        ) : null}
        {showAvatar ? <div className="mt-4"><AvatarCropField ref={avatarRef} existingUrl={account.avatarUrl} disabled={pending} onDirty={setAvatarDirty} /></div> : null}
        <div className="mt-6 border-t border-line pt-5">
          <DisplayPreferencesFields idPrefix="user-display" values={display} onChange={setDisplay} system={brand.display} allowSystemDefault />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-paper px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-ice">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={!canSave} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60">
            {t("actions.save")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function PlayerSummary({ player }: { player: EhlPlayerProfile }) {
  const bits = [player.name, player.number ? `nr. ${player.number}` : "", player.position, player.team].filter(Boolean);
  return (
    <span className="flex items-center gap-2 font-normal text-ink">
      {player.photoUrl ? <ContentImage src={player.photoUrl} className="h-10 w-10 rounded-lg bg-ice object-contain object-center" /> : null}
      {bits.join(", ")}
    </span>
  );
}

function NameField({
  label,
  name,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        required
        name={name}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg bg-ice px-3 text-sm font-normal ring-1 ring-line"
      />
    </label>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
