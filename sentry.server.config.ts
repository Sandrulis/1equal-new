import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions, sentryDsn } from "@/app/lib/sentry-options";

const dsn = sentryDsn();

if (dsn) {
  Sentry.init({
    ...sentryBaseOptions(dsn),
    includeLocalVariables: false,
  });
}
