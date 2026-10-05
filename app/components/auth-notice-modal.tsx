"use client";

import { useEffect, useRef, useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { emphasize } from "@/app/lib/emphasize";
import { useLanguage } from "@/app/lib/language";

const REDIRECT_SECONDS = 10;

export function AuthNoticeModal({
  open,
  title,
  description,
  body,
  highlight = "",
  onLeave,
}: {
  open: boolean;
  title: string;
  description: string;
  body: string;
  highlight?: string;
  onLeave: () => void;
}) {
  const { t } = useLanguage();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const [wasOpen, setWasOpen] = useState(open);
  const leftRef = useRef(false);
  const onLeaveRef = useRef(onLeave);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSeconds(REDIRECT_SECONDS);
  }

  function leave() {
    if (leftRef.current) return;
    leftRef.current = true;
    onLeaveRef.current();
  }

  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    if (!open) return;
    leftRef.current = false;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(Math.max(0, REDIRECT_SECONDS - elapsed));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open || seconds > 0) return;
    leave();
  }, [open, seconds]);

  return (
    <AdminDialog open={open} title={title} lead={description} onClose={leave}>
      <p className="text-sm leading-6 text-muted">{emphasize(body, highlight)}</p>
      <p className="mt-4 text-sm text-muted">{t("auth.notice.redirect_in", { seconds })}</p>
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={leave} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90">
          {t("auth.notice.home")}
        </button>
      </div>
    </AdminDialog>
  );
}
