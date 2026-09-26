export function sentryDsn() {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "";
}

export function sentryEnvironment(fallback = "") {
  return process.env.SENTRY_ENVIRONMENT || fallback || process.env.NODE_ENV || "development";
}

export function sentryRelease() {
  return process.env.SENTRY_RELEASE || process.env.npm_package_version;
}

export function sentryBaseOptions(dsn: string, environment?: string) {
  return {
    dsn,
    environment: sentryEnvironment(environment),
    release: sentryRelease(),
    dataCollection: {},
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    enableLogs: true,
  };
}
