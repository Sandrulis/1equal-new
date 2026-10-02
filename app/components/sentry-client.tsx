"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { sentryBaseOptions } from "@/app/lib/sentry-options";

export function SentryClient({ dsn, environment }: { dsn: string | null; environment: string }) {
  useEffect(() => {
    if (!dsn || Sentry.getClient()) return;
    Sentry.init({
      ...sentryBaseOptions(dsn, environment),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  }, [dsn, environment]);

  return null;
}
