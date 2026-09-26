import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const { getPublicSentry } = await import("@/app/lib/site-admin/repository");
      const config = await getPublicSentry();
      if (config) {
        process.env.SENTRY_DSN = config.dsn;
        if (!process.env.SENTRY_ENVIRONMENT) process.env.SENTRY_ENVIRONMENT = config.environment;
      }
    }
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
