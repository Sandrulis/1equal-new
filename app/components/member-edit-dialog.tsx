"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { AvatarCropField, type AvatarCropHandle } from "@/app/components/avatar-crop-field";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { saveUserAvatar } from "@/app/lib/auth/actions";
import type { Member, Subteam } from "@/app/lib/demo-data";
import { parseEhlPlayerUrl } from "@/app/lib/ehl-player";
import { useLanguage } from "@/app/lib/language";
import { lookupPlayerLink, saveMemberProfile } from "@/app/lib/team-actions";

const fieldClass = "mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train";

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
  subteams,
  onClose,
  onSaved,
}: {
  member: Member;
  teamId: string | null;
  remote: boolean;
  self?: boolean;
  subteams: Subteam[];
  onClose: () => void;
  onSaved: (member: Member, teamCode: string) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const startNumber = member.number == null ? "" : String(member.number);
  const startIds = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
  const startFee = member.feeExempt === true;
  const [number, setNumber] = useState(startNumber);
  const [position, setPosition] = useState(member.position);
  const [phone, setPhone] = useState(member.phone);
  const [playerUrl, setPlayerUrl] = useState(member.ehl?.sourceUrl ?? "");
  const [selectedIds, setSelectedIds] = useState(startIds);
  const [feeExempt, setFeeExempt] = useState(startFee);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const avatarRef = useRef<AvatarCropHandle>(null);
  const showAvatar = self && remote && playerUrl.trim() === "";
  const dirty =
    number.trim() !== startNumber ||
    position.trim() !== member.position.trim() ||
    phone.trim() !== member.phone.trim() ||
    playerUrl.trim() !== (member.ehl?.sourceUrl ?? "") ||
    feeExempt !== startFee ||
    !sameIds(selectedIds, startIds) ||
    (showAvatar && avatarDirty);
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
    setPosition((current) => (current.trim() ? current : result.position));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!dirty || pending) return;
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
      const result = await saveMemberProfile({ teamId, userId: member.id, number, position, phone, playerUrl, subteamIds: selectedIds, feeExempt });
      setPending(false);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      onSaved(result.member, result.teamCode);
      showFeedback({ message: t("roster.saved"), variant: "success" });
      onClose();
      return;
    }
    const trimmedNumber = number.trim();
    const parsed = Number.parseInt(trimmedNumber, 10);
    onSaved(
      {
        ...member,
        number: trimmedNumber && Number.isInteger(parsed) && parsed >= 0 && parsed <= 99 ? parsed : null,
        position: position.trim(),
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
    <AdminDialog open title={t("roster.edit.title")} lead={t("roster.edit.lead")} onClose={pending ? () => undefined : onClose}>
      <form onSubmit={(event) => void save(event)} className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">{t("roster.fields.number")}</span>
          <input value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className={fieldClass} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("roster.fields.position")}</span>
          <input value={position} onChange={(event) => setPosition(event.target.value)} maxLength={40} className={fieldClass} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("roster.fields.phone")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" maxLength={40} className={fieldClass} />
        </label>
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
        {showAvatar ? <AvatarCropField ref={avatarRef} existingUrl={member.ehl?.photoUrl ? null : member.photoUrl} disabled={pending} onDirty={setAvatarDirty} /> : null}
        {subteams.length ? (
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
