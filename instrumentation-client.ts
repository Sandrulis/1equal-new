import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions, sentryDsn } from "@/app/lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || sentryDsn();

if (dsn) {
  Sentry.init({
    ...sentryBaseOptions(dsn),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
