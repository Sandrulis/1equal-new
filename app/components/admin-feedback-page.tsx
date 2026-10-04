"use client";

import { useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { deleteAdminFeedback } from "@/app/lib/site-admin/actions";
import type { AdminFeedbackItem, AdminFeedbackKind } from "@/app/lib/site-admin/types";

const FILTERS: { id: "all" | AdminFeedbackKind; label: MessageKey }[] = [
  { id: "all", label: "admin.feedback.all" },
  { id: "bug", label: "admin.feedback.bug" },
  { id: "suggestion", label: "nav.suggestions" },
  { id: "feedback", label: "nav.feedback" },
];

const KIND_LABEL: Record<AdminFeedbackKind, MessageKey> = {
  bug: "admin.feedback.bug",
  suggestion: "nav.suggestions",
  feedback: "nav.feedback",
};

export function AdminFeedbackPage({ items, onChange }: { items: AdminFeedbackItem[]; onChange: (items: AdminFeedbackItem[]) => void }) {
  const { t } = useLanguage();
  const { formatDateTime } = useDisplayFormat();
  const { showFeedback } = useFeedbackToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminFeedbackItem | null>(null);
  const [pending, setPending] = useState(false);
  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);

  async function remove() {
    if (!deleteTarget || pending) return;
    setPending(true);
    const result = await deleteAdminFeedback(deleteTarget.id);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    onChange(result.items);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted">{t("admin.feedback.lead")}</p>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === item.id ? "bg-navy text-white" : "bg-ice text-ink"}`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="text-sm text-muted">{t("admin.feedback.empty")}</p> : null}
      <ul className="space-y-3">
        {visible.map((item) => (
          <li key={item.id} className="rounded-2xl bg-paper p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{t(KIND_LABEL[item.kind])}</p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(item.createdAt)}</p>
              </div>
              <IconTipButton label={t("actions.delete")} tone="game" disabled={pending} onClick={() => setDeleteTarget(item)}>
                <IconTrash />
              </IconTipButton>
            </div>
            {item.title ? <h2 className="mt-2 text-base font-semibold">{item.title}</h2> : null}
            {item.rating != null ? <p className="mt-1 text-sm font-medium">{t("feedback.general.rating")}: {item.rating}/5</p> : null}
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{item.body}</p>
            <p className="mt-3 text-sm text-muted">{item.authorName || item.authorEmail}</p>
            {item.authorName && item.authorEmail ? <p className="text-sm text-muted">{item.authorEmail}</p> : null}
          </li>
        ))}
      </ul>
      <AdminDialog
        open={deleteTarget !== null}
        title={t("admin.feedback.delete.title")}
        lead={t("admin.feedback.delete.lead")}
        onClose={pending ? () => undefined : () => setDeleteTarget(null)}
      >
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="button" onClick={() => void remove()} disabled={pending} className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.delete")}
          </button>
        </div>
      </AdminDialog>
    </div>
  );
}
