"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { AvatarCropField, type AvatarCropHandle } from "@/app/components/avatar-crop-field";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { saveUserAvatar } from "@/app/lib/auth/actions";
import type { Member, Subteam } from "@/app/lib/demo-data";
import { parseEhlPlayerUrl } from "@/app/lib/ehl-player";
import { useLanguage } from "@/app/lib/language";
import { isEmailAddress } from "@/app/lib/email/email-address";
import { formatPosition, parseExtraPositions, resolvePositionCode, type PositionCatalogItem } from "@/app/lib/positions";
import { lookupPlayerLink, saveMemberProfile } from "@/app/lib/team-actions";

const fieldClass = "mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train";

function personParts(member: Member): { first: string; last: string } {
  if (member.firstName || member.lastName) return { first: member.firstName ?? "", last: member.lastName ?? "" };
  const parts = member.name.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sorted = [...right].sort();
  return [...left].sort().every((id, index) => id === sorted[index]);
}

export function MemberEditDialog({
  member,
  teamId,
  remote,
  self = false,
  canManage = false,
  canRoster = false,
  canAppoint = false,
  entuziasti = true,
  positions,
  subteams,
  onClose,
  onSaved,
}: {
  member: Member;
  teamId: string | null;
  remote: boolean;
  self?: boolean;
  canManage?: boolean;
  canRoster?: boolean;
  canAppoint?: boolean;
  entuziasti?: boolean;
  positions: PositionCatalogItem[];
  subteams: Subteam[];
  onClose: () => void;
  onSaved: (member: Member, teamCode: string) => void;
}) {
  const { t, lang, languages } = useLanguage();
  const fallbackLang = languages.find((language) => language.isDefault)?.code ?? lang;
  const { showFeedback } = useFeedbackToast();
  const startNumber = member.number == null ? "" : String(member.number);
  const startIds = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
  const startFee = member.feeExempt === true;
  const startPosition = resolvePositionCode(member.position, positions);
  const startExtras = parseExtraPositions(member.extraPositions, startPosition, positions);
  const startPerson = personParts(member);
  const startEmail = member.email.trim().toLowerCase();
  const startAdmin = member.teamAdmin === true;
  const [firstName, setFirstName] = useState(startPerson.first);
  const [lastName, setLastName] = useState(startPerson.last);
  const [email, setEmail] = useState(member.email);
  const [teamAdmin, setTeamAdmin] = useState(startAdmin);
  const [number, setNumber] = useState(startNumber);
  const [position, setPosition] = useState<string>(startPosition);
  const [phone, setPhone] = useState(member.phone);
  const [playerUrl, setPlayerUrl] = useState(member.ehl?.sourceUrl ?? "");
  const [selectedIds, setSelectedIds] = useState(startIds);
  const [extraPositions, setExtraPositions] = useState<string[]>(startExtras);
  const [feeExempt, setFeeExempt] = useState(startFee);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const avatarRef = useRef<AvatarCropHandle>(null);
  const canProfile = canManage || canRoster;
  const showAvatar = canProfile && self && remote && playerUrl.trim() === "";
  const dirty =
    (canManage && (firstName.trim() !== startPerson.first || lastName.trim() !== startPerson.last || email.trim().toLowerCase() !== startEmail)) ||
    (canAppoint && teamAdmin !== startAdmin) ||
    (canProfile &&
      (number.trim() !== startNumber ||
        position !== startPosition ||
        !sameIds(extraPositions, startExtras) ||
        phone.trim() !== member.phone.trim() ||
        playerUrl.trim() !== (member.ehl?.sourceUrl ?? "") ||
        (showAvatar && avatarDirty))) ||
    (canRoster && (feeExempt !== startFee || !sameIds(selectedIds, startIds)));
  const fillFromLinkRef = useRef<() => void>(() => {});

  useEffect(() => {
    fillFromLinkRef.current = () => {
      void fillFromLink();
    };
  });

  useEffect(() => {
    const raw = playerUrl.trim();
    if (!remote || !parseEhlPlayerUrl(raw) || raw === (member.ehl?.sourceUrl ?? "")) return;
    const handle = window.setTimeout(() => {
      fillFromLinkRef.current();
    }, 500);
    return () => window.clearTimeout(handle);
  }, [playerUrl, remote, member.ehl?.sourceUrl]);

  async function fillFromLink() {
    const raw = playerUrl.trim();
    if (!raw || !remote || pending || raw === (member.ehl?.sourceUrl ?? "")) return;
    setPending(true);
    const result = await lookupPlayerLink(raw);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setNumber((current) => (current.trim() ? current : result.number));
    setPosition((current) => current || resolvePositionCode(result.position, positions));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!dirty || pending) return;
    if (canManage && (!firstName.trim() || !lastName.trim())) {
      showFeedback({ message: t("roster.error.name"), variant: "error" });
      return;
    }
    if (canManage && !isEmailAddress(email.trim().toLowerCase())) {
      showFeedback({ message: t("roster.error.email"), variant: "error" });
      return;
    }
    if (remote && teamId) {
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
        }
      }
      setPending(true);
      const result = await saveMemberProfile({
        teamId,
        userId: member.id,
        number,
        position,
        extraPositions,
        phone,
        playerUrl,
        subteamIds: selectedIds,
        feeExempt,
        ...(canManage ? { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase() } : {}),
        ...(canAppoint ? { teamAdmin } : {}),
      });
      setPending(false);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      onSaved(result.member, result.teamCode);
      showFeedback({ message: t(result.emailSent ? "roster.email.sent" : "roster.saved"), variant: "success" });
      onClose();
      return;
    }
    const trimmedNumber = number.trim();
    const parsed = Number.parseInt(trimmedNumber, 10);
    onSaved(
      {
        ...member,
        number: trimmedNumber && Number.isInteger(parsed) && parsed >= 0 && parsed <= 99 ? parsed : null,
        position,
        extraPositions: parseExtraPositions(extraPositions, position, positions),
        ...(canManage
          ? {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              name: `${firstName.trim()} ${lastName.trim()}`.trim(),
              email: email.trim().toLowerCase(),
            }
          : {}),
        ...(canAppoint ? { teamAdmin } : {}),
        phone: phone.trim(),
        subteamId: selectedIds[0] ?? "",
        subteamIds: selectedIds,
        feeExempt,
      },
      "",
    );
    onClose();
  }

  return (
    <AdminDialog open closeButton size="edit" title={t("roster.edit.title")} lead={t(canRoster ? "roster.edit.lead" : "roster.edit.self")} onClose={pending ? () => undefined : onClose}>
      <form onSubmit={(event) => void save(event)} className="space-y-3">
        {canAppoint ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-ice px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">{t("roles.admin")}</span>
              <span className="block text-xs text-muted">{t("roster.admin.hint")}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={teamAdmin}
              aria-label={t("roles.admin")}
              onClick={() => setTeamAdmin((current) => !current)}
              className={`relative h-6 w-11 shrink-0 rounded-full ${teamAdmin ? "bg-train" : "bg-line"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${teamAdmin ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        ) : null}
        {canManage ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0 text-sm">
              <span className="text-muted">{t("auth.firstName")}</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} autoComplete="off" className={fieldClass} />
            </label>
            <label className="block min-w-0 text-sm">
              <span className="text-muted">{t("auth.lastName")}</span>
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} autoComplete="off" className={fieldClass} />
            </label>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          {canManage ? (
            <label className={`block min-w-0 text-sm ${canProfile ? "" : "col-span-2"}`}>
              <span className="text-muted">{t("auth.email")}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={200} autoComplete="off" className={fieldClass} />
            </label>
          ) : null}
          {canProfile ? (
            <label className={`block min-w-0 text-sm ${canManage ? "" : "col-span-2"}`}>
              <span className="text-muted">{t("roster.fields.phone")}</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" maxLength={40} className={fieldClass} />
            </label>
          ) : null}
        </div>
        {canProfile ? (
        <>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 text-sm">
            <span className="text-muted">{t("roster.fields.number")}</span>
            <input value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className={fieldClass} />
          </label>
          {positions.length ? (
          <label className="block min-w-0 text-sm">
            <span className="text-muted">{t("roster.fields.position")}</span>
            <select
              value={position}
              onChange={(event) => {
                const next = event.target.value;
                setPosition(next);
                setExtraPositions((current) => current.filter((code) => code !== next));
              }}
              className={fieldClass}
            >
              <option value="">{t("roster.fields.position.none")}</option>
              {positions.map((item) => (
                <option key={item.code} value={item.code}>
                  {formatPosition(item.code, positions, lang, fallbackLang, t).label}
                </option>
              ))}
            </select>
          </label>
          ) : (
            <p className="self-end text-sm text-muted">{t("roster.positions.empty")}</p>
          )}
        </div>
        {positions.some((item) => item.code !== position) ? (
        <fieldset>
          <legend className="text-sm text-muted">{t("roster.fields.positions_extra")}</legend>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line">
            {positions.filter((item) => item.code !== position).map((item) => {
              const checked = extraPositions.includes(item.code);
              return (
                <label key={item.code} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setExtraPositions((current) => (current.includes(item.code) ? current.filter((code) => code !== item.code) : [...current, item.code]))}
                    className="h-5 w-5 shrink-0 appearance-none rounded-md bg-paper ring-1 ring-line checked:bg-navy checked:ring-navy"
                  />
                  {formatPosition(item.code, positions, lang, fallbackLang, t).label}
                </label>
              );
            })}
          </div>
        </fieldset>
        ) : null}
        {entuziasti ? (
        <label className="block text-sm">
          <span className="text-muted">{t("user.settings.player")}</span>
          <input
            value={playerUrl}
            onChange={(event) => {
              setPlayerUrl(event.target.value);
              if (event.target.value.trim()) setAvatarDirty(false);
            }}
            onBlur={() => void fillFromLink()}
            placeholder={t("user.settings.player_placeholder")}
            className={fieldClass}
          />
        </label>
        ) : null}
        {showAvatar ? <AvatarCropField ref={avatarRef} existingUrl={member.ehl?.photoUrl ? null : member.photoUrl} disabled={pending} onDirty={setAvatarDirty} /> : null}
        </>
        ) : null}
        {canRoster && subteams.length ? (
          <fieldset>
            <legend className="text-sm text-muted">{t("player.subteams")}</legend>
            <div className="mt-2 overflow-hidden rounded-xl bg-paper ring-1 ring-line">
              {subteams.map((subteam) => {
                const checked = selectedIds.includes(subteam.id);
                return (
                  <label key={subteam.id} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedIds((current) => (current.includes(subteam.id) ? current.filter((id) => id !== subteam.id) : [...current, subteam.id]))}
                      className="h-5 w-5 shrink-0 appearance-none rounded-md bg-paper ring-1 ring-line checked:bg-navy checked:ring-navy"
                    />
                    <span className="h-4 w-4 shrink-0 rounded-md" style={{ background: subteam.color }} />
                    <span className="text-sm">{subteam.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        {canRoster ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-ice px-3 py-2.5">
          <span>
            <span className="block text-sm font-medium">{t("roster.fee_exempt")}</span>
            <span className="block text-xs text-muted">{t("roster.fee_exempt.hint")}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={feeExempt}
            onClick={() => setFeeExempt((current) => !current)}
            className={`relative h-6 w-11 shrink-0 rounded-full ${feeExempt ? "bg-train" : "bg-line"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${feeExempt ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={!dirty || pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.save")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
