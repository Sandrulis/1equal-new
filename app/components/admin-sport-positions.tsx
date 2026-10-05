"use client";

import { useEffect, useRef, useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconPencil, IconPlus, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { useLanguage } from "@/app/lib/language";
import { cleanPositionCode } from "@/app/lib/positions";
import { deleteSportPosition, reorderSportPositions, saveSportPosition } from "@/app/lib/site-admin/actions";
import type { SiteLanguage } from "@/app/lib/site-admin/types";
import { sportLabel, type Sport, type SportPosition } from "@/app/lib/sports";

const fieldClass = "mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm text-ink ring-1 ring-line outline-none focus:ring-train disabled:opacity-60";

export function AdminSportPositions({
  sport,
  languages,
  onClose,
  onChange,
}: {
  sport: Sport;
  languages: SiteLanguage[];
  onClose: () => void;
  onChange: (sports: Sport[]) => void;
}) {
  const { t, lang, languages: uiLanguages } = useLanguage();
  const fallback = uiLanguages.find((language) => language.isDefault)?.code ?? lang;
  const { showFeedback } = useFeedbackToast();
  const [editing, setEditing] = useState<SportPosition | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SportPosition | null>(null);
  const [positions, setPositions] = useState(sport.positions);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [gap, setGap] = useState<number | null>(null);
  const [lineTop, setLineTop] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragId = useRef<string | null>(null);
  const gapRef = useRef<number | null>(null);
  const pendingOrder = useRef<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const formOpen = creating || editing !== null;
  const incomingOrder = sport.positions.map((position) => position.id).join(",");

  useEffect(() => {
    if (pendingOrder.current && pendingOrder.current !== incomingOrder) return;
    pendingOrder.current = null;
    setPositions(sport.positions);
  }, [incomingOrder, sport.positions]);

  function closeForm() {
    if (pending) return;
    setCreating(false);
    setEditing(null);
  }

  async function persist(task: () => Promise<{ ok: true; sports: Sport[] } | { ok: false; error: Parameters<typeof t>[0] }>, savedKey: "sports.positions.saved" | "sports.positions.deleted" | null) {
    if (pending) return;
    setPending(true);
    try {
      const result = await task();
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      onChange(result.sports);
      setCreating(false);
      setEditing(null);
      setDeleteTarget(null);
      if (savedKey) showFeedback({ message: t(savedKey), variant: "success" });
    } catch {
      showFeedback({ message: t("auth.error.generic"), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  function gapAt(clientY: number) {
    const list = listRef.current;
    if (!list) return null;
    const rows = [...list.querySelectorAll<HTMLElement>("[data-position-id]")];
    if (rows.length === 0) return null;
    const listTop = list.getBoundingClientRect().top;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const top = row.offsetTop;
      const mid = listTop + top + row.offsetHeight / 2;
      if (clientY < mid) return { index, top };
    }
    const last = rows[rows.length - 1];
    return { index: rows.length, top: last.offsetTop + last.offsetHeight };
  }

  function trackGap(clientY: number) {
    const next = gapAt(clientY);
    if (!next || next.index === gapRef.current) return;
    const list = listRef.current;
    const limit = list ? Math.max(list.clientHeight - 2, 0) : next.top;
    gapRef.current = next.index;
    setGap(next.index);
    setLineTop(Math.min(Math.max(next.top, 1), limit));
  }

  function moveToGap(fromId: string, insertAt: number) {
    if (pending || formOpen) return;
    setPositions((current) => {
      const from = current.findIndex((position) => position.id === fromId);
      const to = insertAt > from ? insertAt - 1 : insertAt;
      if (from < 0 || to < 0 || to === from || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      const ids = next.map((position) => position.id);
      const sent = ids.join(",");
      pendingOrder.current = sent;
      saveQueue.current = saveQueue.current.then(async () => {
        const result = await reorderSportPositions(sport.id, ids);
        if (pendingOrder.current !== sent) return;
        pendingOrder.current = null;
        if (!result.ok) {
          showFeedback({ message: t(result.error), variant: "error" });
          if (result.sports) onChange(result.sports);
          return;
        }
        onChange(result.sports);
      });
      return next;
    });
  }

  function clearDrag() {
    dragId.current = null;
    gapRef.current = null;
    setDraggingId(null);
    setGap(null);
    setLineTop(null);
  }

  function finishDrag() {
    const fromId = dragId.current;
    const insertAt = gapRef.current;
    clearDrag();
    if (fromId && insertAt !== null) moveToGap(fromId, insertAt);
  }

  return (
    <>
      <AdminDialog
        open
        wide
        title={sportLabel(sport, lang, fallback)}
        lead={t("sports.positions.lead")}
        onClose={pending || formOpen || deleteTarget ? () => undefined : onClose}
      >
        <div className="space-y-4">
          <button type="button" onClick={() => { setEditing(null); setCreating(true); }} disabled={pending || formOpen} className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            <IconPlus />
            {t("sports.positions.add")}
          </button>
          {positions.length === 0 ? (
            <p className="rounded-xl bg-ice px-3 py-4 text-sm text-muted">{t("sports.positions.empty")}</p>
          ) : (
            <ul ref={listRef} className="relative overflow-hidden rounded-xl ring-1 ring-line">
              {draggingId !== null && lineTop !== null ? (
                <span
                  aria-hidden="true"
                  className="position-gap-line pointer-events-none absolute right-3 left-3 z-10 h-0.5 rounded-full bg-navy motion-safe:transition-[top] motion-safe:duration-200 motion-safe:ease-out"
                  style={{ top: lineTop }}
                />
              ) : null}
              {positions.map((position, index) => {
                const name = position.names[lang]?.trim() || position.names[fallback]?.trim() || "";
                const dragging = draggingId === position.id;
                const fromIndex = draggingId ? positions.findIndex((item) => item.id === draggingId) : -1;
                const nudge = rowNudge(index, fromIndex, gap);
                return (
                  <li
                    key={position.id}
                    data-position-id={position.id}
                    className={`relative flex items-center gap-2 border-b border-line px-2 py-2 last:border-b-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out ${dragging ? "opacity-40" : ""}`}
                    style={nudge ? { transform: `translateY(${nudge}px)` } : undefined}
                  >
                    <button
                      type="button"
                      className="list-drag-handle grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted"
                      aria-label={t("admin.todo.drag")}
                      disabled={pending || formOpen}
                      onPointerDown={(event) => {
                        if (pending || formOpen || event.button !== 0) return;
                        event.preventDefault();
                        dragId.current = position.id;
                        setDraggingId(position.id);
                        event.currentTarget.setPointerCapture(event.pointerId);
                        trackGap(event.clientY);
                      }}
                      onPointerMove={(event) => {
                        if (dragId.current !== position.id) return;
                        trackGap(event.clientY);
                      }}
                      onPointerUp={() => {
                        if (dragId.current === position.id) finishDrag();
                      }}
                      onPointerCancel={() => {
                        if (dragId.current === position.id) clearDrag();
                      }}
                    >
                      <GripIcon />
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{position.code}</span>
                      {name ? <span className="ml-2 text-sm text-muted">{name}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <IconTipButton label={t("actions.edit")} tone="muted" disabled={pending || formOpen} onClick={() => { setCreating(false); setEditing(position); }}>
                        <IconPencil />
                      </IconTipButton>
                      <IconTipButton label={t("actions.delete")} tone="game" disabled={pending || formOpen} onClick={() => setDeleteTarget(position)}>
                        <IconTrash />
                      </IconTipButton>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AdminDialog>
      <AdminDialog
        open={formOpen}
        layer="top"
        title={editing ? t("actions.edit") : t("sports.positions.add")}
        onClose={closeForm}
      >
        <PositionForm
          key={editing?.id ?? "new"}
          position={editing}
          languages={languages}
          pending={pending}
          onCancel={closeForm}
          onSave={(input) =>
            void persist(
              () => saveSportPosition({ sportId: sport.id, id: editing?.id ?? null, code: input.code, names: input.names }),
              "sports.positions.saved",
            )
          }
        />
      </AdminDialog>
      <AdminDialog
        open={deleteTarget !== null}
        layer="top"
        title={t("sports.positions.delete.title")}
        lead={deleteTarget ? t("sports.positions.delete.lead", { code: deleteTarget.code }) : undefined}
        onClose={pending ? () => undefined : () => setDeleteTarget(null)}
      >
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!deleteTarget) return;
              void persist(() => deleteSportPosition(sport.id, deleteTarget.id), "sports.positions.deleted");
            }}
            disabled={pending}
            className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("actions.delete")}
          </button>
        </div>
      </AdminDialog>
    </>
  );
}

function rowNudge(index: number, fromIndex: number, gap: number | null): number {
  if (gap === null || fromIndex < 0 || index === fromIndex) return 0;
  if (gap <= fromIndex && index >= gap && index < fromIndex) return 8;
  if (gap > fromIndex + 1 && index > fromIndex && index < gap) return -8;
  return 0;
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="5" cy="3.5" r="1.2" />
      <circle cx="11" cy="3.5" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="12.5" r="1.2" />
      <circle cx="11" cy="12.5" r="1.2" />
    </svg>
  );
}

function PositionForm({
  position,
  languages,
  pending,
  onCancel,
  onSave,
}: {
  position: SportPosition | null;
  languages: SiteLanguage[];
  pending: boolean;
  onCancel: () => void;
  onSave: (input: { code: string; names: Record<string, string> }) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [code, setCode] = useState(position?.code ?? "");
  const [names, setNames] = useState<Record<string, string>>(() => ({ ...(position?.names ?? {}) }));
  const activeLanguages = languages.filter((language) => language.isActive);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        if (!cleanPositionCode(code)) {
          showFeedback({ message: t("sports.positions.error.code"), variant: "error" });
          return;
        }
        if (!activeLanguages.every((language) => (names[language.code] ?? "").trim().length > 0)) {
          showFeedback({ message: t("sports.error.name"), variant: "error" });
          return;
        }
        onSave({ code, names });
      }}
    >
      <label className="block text-sm">
        <span className="text-muted">{t("sports.positions.code")}</span>
        <input
          value={code}
          maxLength={8}
          disabled={pending}
          autoCapitalize="characters"
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
          className={fieldClass}
        />
      </label>
      {languages.map((language) => (
        <label key={language.code} className="block text-sm">
          <span className="text-muted">
            {language.name}
            {language.isActive ? "" : ` (${t("sports.inactive")})`}
          </span>
          <input
            value={names[language.code] ?? ""}
            maxLength={80}
            disabled={pending}
            onChange={(event) => setNames((current) => ({ ...current, [language.code]: event.target.value }))}
            className={fieldClass}
          />
        </label>
      ))}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
          {t("actions.cancel")}
        </button>
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
          {t("actions.save")}
        </button>
      </div>
    </form>
  );
}
