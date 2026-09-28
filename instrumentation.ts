import * as Sentry from "@sentry/nextjs";

export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  } catch (error) {
    console.error("Sentry instrumentation failed", error);
  }
}

export const onRequestError = Sentry.captureRequestError;
