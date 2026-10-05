"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AvatarCropField, type AvatarCropHandle } from "@/app/components/avatar-crop-field";
import { DisplayPreferencesFields } from "@/app/components/display-preferences";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { requestAccountDeletion, saveUserAvatar, signOut, updateProfile } from "@/app/lib/auth/actions";
import { isEmailAddress } from "@/app/lib/email/email-address";
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
  entuziasti = true,
  onClose,
  onSaved,
}: {
  account: AccountProfile;
  teamCode?: string | null;
  teamName?: string | null;
  entuziasti?: boolean;
  onClose: () => void;
  onSaved: (account: Pick<AccountProfile, "firstName" | "lastName" | "ehlPlayers" | "avatarUrl" | "display" | "phone">) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const brand = useSiteBrand();
  const titleId = useId();
  const savedPlayer = teamPlayer(account, teamCode);
  const mounted = useIsClient();
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [email, setEmail] = useState(account.email);
  const [phone, setPhone] = useState(account.phone);
  const [playerUrl, setPlayerUrl] = useState(savedPlayer?.sourceUrl ?? "");
  const [display, setDisplay] = useState<UserDisplayPreferences>(account.display);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const avatarRef = useRef<AvatarCropHandle>(null);
  const savedUrl = savedPlayer?.sourceUrl ?? "";
  const hasTeam = Boolean(teamCode);
  const showPlayerLink = entuziasti && hasTeam;
  const showAvatar = showPlayerLink ? playerUrl.trim() === "" : savedUrl === "";
  const emailValue = email.trim().toLowerCase();
  const emailChanged = emailValue !== account.email.trim().toLowerCase();
  const dirty = firstName !== account.firstName || lastName !== account.lastName || emailChanged || phone !== account.phone || (showPlayerLink && playerUrl.trim() !== savedUrl) || !userDisplayEqual(display, account.display) || (showAvatar && avatarDirty);
  const canSave = dirty && firstName.trim() !== "" && lastName.trim() !== "" && isEmailAddress(emailValue) && !pending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const form = event.currentTarget;
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
    const result = await updateProfile(new FormData(form));
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
      phone,
      ehlPlayers,
      avatarUrl,
      display: result.display ?? display,
    });
    showFeedback({ message: t(result.emailSent ? "user.settings.email_sent" : "user.settings.saved"), variant: "success" });
    onClose();
  }

  async function onDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deletePending || deletePassword.length === 0) return;
    setDeletePending(true);
    const result = await requestAccountDeletion(new FormData(event.currentTarget));
    if ("error" in result) {
      setDeletePending(false);
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    if ("sent" in result) {
      setDeletePending(false);
      setDeleteArmed(false);
      showFeedback({ message: t("user.delete.email_sent"), variant: "success" });
      return;
    }
    showFeedback({ message: t("user.delete.scheduled"), variant: "success" });
    await signOut();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 ring-1 ring-line">
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
        <form onSubmit={(event) => void onSubmit(event)}>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <NameField label={t("auth.firstName")} name="firstName" value={firstName} autoComplete="given-name" onChange={setFirstName} />
          <NameField label={t("auth.lastName")} name="lastName" value={lastName} autoComplete="family-name" onChange={setLastName} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            {t("common.email")}
            <input
              name="email"
              type="email"
              required
              value={email}
              autoComplete="email"
              maxLength={200}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-lg bg-ice px-3 text-sm font-normal ring-1 ring-line"
            />
            {emailChanged ? <span className="font-normal text-muted">{t("user.settings.email_hint")}</span> : null}
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            {t("roster.fields.phone")}
            <input
              name="phone"
              type="tel"
              value={phone}
              inputMode="tel"
              autoComplete="tel"
              maxLength={40}
              onChange={(event) => setPhone(event.target.value)}
              className="h-11 rounded-lg bg-ice px-3 text-sm font-normal ring-1 ring-line"
            />
          </label>
        </div>
        {showPlayerLink && teamCode ? (
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
          <button type="submit" disabled={!canSave || deletePending} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60">
            {t("actions.save")}
          </button>
        </div>
        </form>
        <div className="mt-8 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">{t("user.delete.title")}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{t("user.delete.lead")}</p>
          {deleteArmed ? (
            <form onSubmit={(event) => void onDelete(event)} className="mt-4 grid gap-3">
              {account.hasPassword ? (
                <>
                  <p className="text-sm text-muted">{t("user.delete.password_lead")}</p>
                  <label className="grid gap-1.5 text-sm font-medium">
                    {t("auth.password")}
                    <input
                      required
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      disabled={deletePending}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      className="h-11 rounded-lg bg-ice px-3 text-sm font-normal ring-1 ring-line"
                    />
                  </label>
                </>
              ) : (
                <p className="text-sm text-muted">{t("user.delete.email_lead", { email: account.email })}</p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" disabled={deletePending} onClick={() => { setDeleteArmed(false); setDeletePassword(""); }} className="rounded-lg bg-paper px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:opacity-60">
                  {t("actions.cancel")}
                </button>
                <button type="submit" disabled={deletePending || (account.hasPassword && deletePassword.length === 0)} className="rounded-lg bg-game px-4 py-2.5 text-sm font-medium text-white hover:bg-game/90 disabled:opacity-60">
                  {account.hasPassword ? t("user.delete.confirm") : t("user.delete.email_button")}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" disabled={pending} onClick={() => setDeleteArmed(true)} className="mt-4 rounded-lg bg-game px-4 py-2.5 text-sm font-medium text-white hover:bg-game/90 disabled:opacity-60">
              {t("user.delete.button")}
            </button>
          )}
        </div>
      </div>
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
