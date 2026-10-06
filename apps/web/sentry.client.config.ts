import * as Sentry from "@sentry/nextjs";

// No replay, request content, traces or error payloads in the no-save MVP.
Sentry.init({
  enabled: false,
  dsn: undefined,
  defaultIntegrations: false,
  integrations: [],
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: () => null,
  beforeSendTransaction: () => null,
  beforeBreadcrumb: () => null,
});
