import * as Sentry from '@sentry/nestjs';
import { filterChatMetric } from './common/chat-metrics';
import { metricsOnlyTransport } from './common/chat-metrics-transport';

// Server aggregates only. Error events, request bodies, traces and profiles stay off.
Sentry.init({
  enabled:
    process.env.SENTRY_METRICS_ENABLED === 'true' && !!process.env.SENTRY_DSN,
  dsn: process.env.SENTRY_DSN,
  defaultIntegrations: false,
  integrations: [],
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  sendDefaultPii: false,
  enableMetrics: true,
  beforeSendMetric: filterChatMetric,
  enableLogs: false,
  beforeSendLog: () => null,
  transport: (options) =>
    metricsOnlyTransport(Sentry.makeNodeTransport(options)),
  beforeSend: () => null,
  beforeSendTransaction: () => null,
  beforeBreadcrumb: () => null,
});
