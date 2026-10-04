import * as Sentry from "@sentry/nextjs";

export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      const { ServerResponse } = await import("node:http");
      // Next 16 proxies /monitoring to Sentry and attaches 11 close listeners. Node warns at 10.
      if (ServerResponse.prototype.getMaxListeners() < 20) ServerResponse.prototype.setMaxListeners(20);
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
