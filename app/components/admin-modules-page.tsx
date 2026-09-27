"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { FRONTEND_MODULE_KEYS, type FrontendModule } from "@/app/lib/frontend-modules";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { createFrontendModule, deleteFrontendModule, setFrontendModuleEnabled } from "@/app/lib/site-admin/actions";

const MODULE_LABEL: Record<string, MessageKey> = {
  [FRONTEND_MODULE_KEYS.subteams]: "nav.subteams",
  [FRONTEND_MODULE_KEYS.gameLayout]: "frontend_modules.game_layout",
  [FRONTEND_MODULE_KEYS.finance]: "frontend_modules.finance",
  [FRONTEND_MODULE_KEYS.calendar]: "frontend_modules.calendar",
};

function sortModules(modules: FrontendModule[]): FrontendModule[] {
  return [...modules].sort((left, right) => left.sortOrder - right.sortOrder || left.moduleKey.localeCompare(right.moduleKey));
}

export function AdminModulesPage({ initialModules }: { initialModules: FrontendModule[] }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const router = useRouter();
  const [modules, setModules] = useState(() => sortModules(initialModules));
  const [seenModules, setSeenModules] = useState(initialModules);
  const [moduleKey, setModuleKey] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FrontendModule | null>(null);
  if (initialModules !== seenModules) {
    setSeenModules(initialModules);
    setModules(sortModules(initialModules));
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!moduleKey.trim() || pendingKey) return;
    setPendingKey("create");
    const result = await createFrontendModule(moduleKey);
    setPendingKey(null);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setModules((current) => sortModules([...current, result.module]));
    setModuleKey("");
    showFeedback({ message: t("frontend_modules.feedback.created"), variant: "success" });
    router.refresh();
  }

  async function toggle(module: FrontendModule, isEnabled: boolean) {
    if (pendingKey) return;
    const previous = modules;
    setModules((current) => current.map((item) => (item.id === module.id ? { ...item, isEnabled } : item)));
    setPendingKey(module.moduleKey);
    const result = await setFrontendModuleEnabled(module.moduleKey, isEnabled);
    setPendingKey(null);
    if (!result.ok) {
      setModules(previous);
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("frontend_modules.feedback.status_saved"), variant: "success" });
    router.refresh();
  }

  async function remove() {
    if (!deleteTarget || pendingKey) return;
    const target = deleteTarget;
    setPendingKey(target.moduleKey);
    const result = await deleteFrontendModule(target.moduleKey);
    setPendingKey(null);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setModules((current) => current.filter((item) => item.moduleKey !== target.moduleKey));
    setDeleteTarget(null);
    showFeedback({ message: t("frontend_modules.feedback.deleted"), variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.admin.modules")}</h1>
      </div>
      <form onSubmit={(event) => void create(event)} className="rounded-2xl bg-paper p-4 ring-1 ring-line">
        <h2 className="text-base font-semibold">{t("frontend_modules.create.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("frontend_modules.create.description")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={moduleKey}
            onChange={(event) => setModuleKey(event.target.value)}
            placeholder={t("frontend_modules.create.key_placeholder")}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg bg-ice px-3 py-2 font-mono text-sm text-ink ring-1 ring-line outline-none placeholder:font-sans focus:ring-train"
          />
          <button type="submit" disabled={pendingKey !== null || !moduleKey.trim()} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.add")}
          </button>
        </div>
      </form>
      {modules.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-8 text-sm text-muted ring-1 ring-line">{t("frontend_modules.empty")}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
          {modules.map((module) => {
            const labelKey = MODULE_LABEL[module.moduleKey];
            const busy = pendingKey === module.moduleKey;
            return (
              <li key={module.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{labelKey ? t(labelKey) : module.moduleKey}</span>
                  {labelKey ? <span className="block truncate font-mono text-xs text-muted">{module.moduleKey}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={module.isEnabled}
                    aria-label={t("frontend_modules.aria.enabled", { key: module.moduleKey })}
                    disabled={pendingKey !== null}
                    onClick={() => void toggle(module, !module.isEnabled)}
                    className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${module.isEnabled ? "bg-navy" : "bg-grid"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition ${module.isEnabled ? "translate-x-5" : ""}`} />
                  </button>
                  <IconTipButton label={t("actions.delete")} tone="game" disabled={busy || pendingKey !== null} onClick={() => setDeleteTarget(module)}>
                    <IconTrash />
                  </IconTipButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <AdminDialog open={deleteTarget !== null} title={t("frontend_modules.delete.title")} lead={deleteTarget ? t("frontend_modules.delete.lead", { key: deleteTarget.moduleKey }) : undefined} onClose={pendingKey ? () => undefined : () => setDeleteTarget(null)}>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={pendingKey !== null} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="button" onClick={() => void remove()} disabled={pendingKey !== null} className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.delete")}
          </button>
        </div>
      </AdminDialog>
    </div>
  );
}
