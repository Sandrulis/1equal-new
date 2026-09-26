"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/lib/language";

export function AdminDialog({
  open,
  title,
  lead,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  lead?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useLanguage();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 ring-1 ring-line ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {lead ? <p className="mt-1 text-sm leading-6 text-muted">{lead}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
