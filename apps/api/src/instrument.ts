import * as Sentry from '@sentry/nestjs';

// No counseling events, request bodies, traces or profiles leave this MVP.
// Re-enable only after a separate allowlist-only telemetry review.
Sentry.init({
  enabled: false,
  dsn: undefined,
  defaultIntegrations: false,
  integrations: [],
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: () => null,
  beforeSendTransaction: () => null,
  beforeBreadcrumb: () => null,
});
