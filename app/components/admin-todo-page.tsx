"use client";

import { useRef, useState } from "react";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";
import { addAdminTodo, deleteAdminTodo, reorderAdminTodos, setAdminTodoDone } from "@/app/lib/site-admin/actions";
import type { AdminTodo } from "@/app/lib/site-admin/types";

export function AdminTodoPage({ initialTodos }: { initialTodos: AdminTodo[] }) {
  const { t } = useLanguage();
  const { formatDateTime } = useDisplayFormat();
  const { showFeedback } = useFeedbackToast();
  const [todos, setTodos] = useState(initialTodos);
  const [draft, setDraft] = useState("");
  const [archive, setArchive] = useState(false);
  const [pending, setPending] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragId = useRef<string | null>(null);
  const overRef = useRef<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const savingIdsRef = useRef(new Set<string>());
  const visible = todos.filter((item) => item.isDone === archive);

  function toggleDone(item: AdminTodo) {
    if (savingIdsRef.current.has(item.id)) return;
    savingIdsRef.current.add(item.id);
    setSavingIds(new Set(savingIdsRef.current));
    const nextDone = !item.isDone;
    saveQueue.current = saveQueue.current.then(async () => {
      const result = await setAdminTodoDone(item.id, nextDone);
      savingIdsRef.current.delete(item.id);
      setSavingIds(new Set(savingIdsRef.current));
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      setTodos(result.todos);
    });
  }

  async function run(action: () => Promise<{ ok: true; todos: AdminTodo[] } | { ok: false; error: Parameters<typeof t>[0] }>) {
    if (pending) return;
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setTodos(result.todos);
  }

  function moveOpen(fromId: string, toId: string) {
    if (fromId === toId) return;
    setTodos((current) => {
      const open = current.filter((item) => !item.isDone);
      const done = current.filter((item) => item.isDone);
      const from = open.findIndex((item) => item.id === fromId);
      const to = open.findIndex((item) => item.id === toId);
      if (from < 0 || to < 0) return current;
      const next = [...open];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      const ids = next.map((entry) => entry.id);
      saveQueue.current = saveQueue.current.then(async () => {
        const result = await reorderAdminTodos(ids);
        if (!result.ok) {
          showFeedback({ message: t(result.error), variant: "error" });
          if ("todos" in result && result.todos) setTodos(result.todos);
          return;
        }
        setTodos((latest) => {
          const latestIds = latest.filter((entry) => !entry.isDone).map((entry) => entry.id).join("\n");
          return latestIds === ids.join("\n") ? result.todos : latest;
        });
      });
      return [...next, ...done];
    });
  }

  function pointOver(clientY: number) {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-todo-id]") ?? [];
    for (const row of rows) {
      const box = row.getBoundingClientRect();
      if (clientY >= box.top && clientY <= box.bottom) return row.dataset.todoId ?? null;
    }
    return null;
  }

  function finishDrag() {
    const fromId = dragId.current;
    const toId = overRef.current;
    dragId.current = null;
    overRef.current = null;
    setDraggingId(null);
    setOverId(null);
    if (fromId && toId) moveOpen(fromId, toId);
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl bg-paper p-5 ring-1 ring-line">
      <p className="text-sm leading-6 text-muted">{t("admin.todo.lead")}</p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const title = draft;
          if (!title.trim()) return;
          setDraft("");
          void run(() => addAdminTodo(title));
        }}
      >
        <input
          value={draft}
          maxLength={500}
          placeholder={t("admin.todo.placeholder")}
          aria-label={t("admin.todo.placeholder")}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-paper px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-navy"
        />
        <button type="submit" disabled={pending || !draft.trim()} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
          {t("actions.add")}
        </button>
      </form>
      <div className="flex gap-2">
        <button type="button" onClick={() => setArchive(false)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${archive ? "bg-ice text-ink" : "bg-navy text-white"}`}>
          {t("admin.todo.open")}
        </button>
        <button type="button" onClick={() => setArchive(true)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${archive ? "bg-navy text-white" : "bg-ice text-ink"}`}>
          {t("admin.todo.archive")}
        </button>
      </div>
      {visible.length === 0 ? <p className="text-sm text-muted">{archive ? t("admin.todo.archive_empty") : t("admin.todo.empty")}</p> : null}
      <ul ref={listRef} className="space-y-2">
        {visible.map((item, index) => (
          <li
            key={item.id}
            data-todo-id={archive ? undefined : item.id}
            className={`flex items-start gap-3 rounded-xl bg-ice px-3 py-2 ${draggingId === item.id ? "opacity-50" : ""} ${overId === item.id && draggingId && draggingId !== item.id ? "ring-2 ring-navy" : ""}`}
          >
            {archive ? null : (
              <button
                type="button"
                className="todo-drag-handle mt-0.5 text-muted"
                aria-label={t("admin.todo.drag")}
                disabled={pending}
                onPointerDown={(event) => {
                  if (pending || event.button !== 0) return;
                  event.preventDefault();
                  dragId.current = item.id;
                  overRef.current = item.id;
                  setDraggingId(item.id);
                  setOverId(item.id);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (dragId.current !== item.id) return;
                  const next = pointOver(event.clientY);
                  if (!next || next === overRef.current) return;
                  overRef.current = next;
                  setOverId(next);
                }}
                onPointerUp={() => {
                  if (dragId.current === item.id) finishDrag();
                }}
                onPointerCancel={() => {
                  if (dragId.current !== item.id) return;
                  dragId.current = null;
                  overRef.current = null;
                  setDraggingId(null);
                  setOverId(null);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  const open = todos.filter((entry) => !entry.isDone);
                  const target = event.key === "ArrowUp" ? index - 1 : index + 1;
                  if (target < 0 || target >= open.length) return;
                  moveOpen(item.id, open[target].id);
                }}
              >
                <GripIcon />
              </button>
            )}
            {savingIds.has(item.id) ? (
              <span className="mt-1 size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-navy" aria-hidden="true" />
            ) : (
              <input
                type="checkbox"
                checked={item.isDone}
                aria-label={item.title}
                onChange={() => toggleDone(item)}
                className="mt-1 size-4"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${item.isDone ? "text-muted line-through" : "text-ink"}`}>{item.title}</p>
              {item.completedAt ? <p className="text-xs text-muted">{t("admin.todo.completed", { date: formatDateTime(item.completedAt) })}</p> : null}
            </div>
            <button type="button" disabled={pending} className="text-sm text-game" onClick={() => void run(() => deleteAdminTodo(item.id))}>
              {t("actions.delete")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
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
