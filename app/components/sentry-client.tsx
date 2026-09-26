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
      replaysOnErrorSampleRate: 1.0,
      integrations: [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })],
    });
  }, [dsn, environment]);

  return null;
}
