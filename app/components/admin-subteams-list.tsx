"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconCheck, IconPencil, IconTipButton, IconTrash, IconX } from "@/app/components/icon-tip-button";
import { formatDisplayDateTime, toLocalDateTimeStamp } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { deleteSubteam, saveSubteam } from "@/app/lib/site-admin/actions";
import type { SystemSubteam, SystemTeam } from "@/app/lib/site-admin/types";

export function AdminSubteamsList({ teams, subteams }: { teams: SystemTeam[]; subteams: SystemSubteam[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0f6e82");
  const [saved, setSaved] = useState({ teamId: "", name: "", color: "#0f6e82" });
  const [pending, setPending] = useState(false);

  function openEdit(subteam: SystemSubteam) {
    setEditingId(subteam.id);
    setTeamId(subteam.teamId);
    setName(subteam.name);
    setColor(subteam.color);
    setSaved({ teamId: subteam.teamId, name: subteam.name, color: subteam.color });
  }

  function close() {
    if (pending) return;
    setEditingId(null);
  }

  const dirty = name.trim() !== "" && (name.trim() !== saved.name || teamId !== saved.teamId || color !== saved.color);

  async function save() {
    if (!dirty || !editingId || pending) return;
    if (!teamId) {
      showFeedback({ message: t("admin.subteams.need_team"), variant: "error" });
      return;
    }
    setPending(true);
    const result = await saveSubteam({ id: editingId, teamId, name, color });
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setEditingId(null);
    showFeedback({ message: t("admin.subteams.saved"), variant: "success" });
    router.refresh();
  }

  async function remove(id: string) {
    if (pending) return;
    setPending(true);
    const result = await deleteSubteam(id);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    if (editingId === id) setEditingId(null);
    showFeedback({ message: t("admin.subteams.deleted"), variant: "success" });
    router.refresh();
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return subteams;
    return subteams.filter((subteam) => [subteam.name, subteam.teamName].join(" ").toLowerCase().includes(needle));
  }, [query, subteams]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.subteams")}</h1>
      </div>

      <label className="mb-4 flex w-full items-center gap-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line focus-within:ring-train">
        <IconSearch />
        <span className="sr-only">{t("admin.subteams.searchLabel")}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admin.subteams.search")}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </label>

      {editingId ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="mb-4 rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className="block text-sm">
              <span className="text-muted">{t("nav.members")}</span>
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted">{t("catalog.name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">{t("catalog.color")}</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label={t("catalog.color")}
                  className="h-10 w-14 rounded-md bg-ice ring-1 ring-line"
                />
                <span className="h-8 w-8 rounded-md" style={{ background: color }} />
              </span>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={close} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
              <IconX />
              {t("actions.cancel")}
            </button>
            <button type="submit" disabled={!dirty || pending} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              <IconCheck />
              {t("actions.save")}
            </button>
          </div>
        </form>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-8 text-sm text-muted ring-1 ring-line">
          {query.trim() ? t("admin.subteams.noMatch") : t("catalog.subteams.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
          {visible.map((subteam) => (
            <li key={subteam.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-md" style={{ background: subteam.color }} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{subteam.name}</span>
                  <span className="block truncate text-xs text-muted">{subteam.teamName}</span>
                  <span className="block text-xs text-muted tabular-nums">{formatDisplayDateTime(toLocalDateTimeStamp(subteam.updatedAt))}</span>
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                <IconTipButton label={t("roster.edit")} tone="train" disabled={pending} onClick={() => openEdit(subteam)}>
                  <IconPencil />
                </IconTipButton>
                <IconTipButton label={t("roster.remove")} tone="game" disabled={pending} onClick={() => void remove(subteam.id)}>
                  <IconTrash />
                </IconTipButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
