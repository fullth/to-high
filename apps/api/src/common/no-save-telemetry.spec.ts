jest.mock('@sentry/nestjs', () => ({ init: jest.fn() }));
import * as Sentry from '@sentry/nestjs';
import '../instrument';

describe('no-save telemetry transport boundary', () => {
  it('disables transport and drops every counseling event kind', () => {
    const config = (Sentry.init as jest.Mock<void, [unknown]>).mock
      .calls[0][0] as {
      enabled: boolean;
      dsn?: string;
      integrations: unknown[];
      beforeSend: (event: unknown) => unknown;
      beforeSendTransaction: (event: unknown) => unknown;
      beforeBreadcrumb: (event: unknown) => unknown;
    };
    const privateEvent = {
      request: { data: { messages: ['private-counseling-marker'] } },
    };
    expect(config.enabled).toBe(false);
    expect(config.dsn).toBeUndefined();
    expect(config.integrations).toEqual([]);
    expect(config.beforeSend(privateEvent)).toBeNull();
    expect(config.beforeSendTransaction(privateEvent)).toBeNull();
    expect(config.beforeBreadcrumb(privateEvent)).toBeNull();
  });
  it('allows explicit server metrics without allowing counseling events', () => {
    const previousDsn = process.env.SENTRY_DSN;
    const previousEnabled = process.env.SENTRY_METRICS_ENABLED;
    try {
      process.env.SENTRY_DSN = 'https://public@example.com/1';
      process.env.SENTRY_METRICS_ENABLED = 'true';
      jest.isolateModules(() => {
        require('../instrument');
      });
      const config = (Sentry.init as jest.Mock).mock.calls.at(-1)![0] as {
        enabled: boolean;
        enableMetrics: boolean;
        enableLogs: boolean;
        beforeSend: (event: unknown) => unknown;
        beforeSendMetric: (metric: unknown) => unknown;
      };
      expect(config.enabled).toBe(true);
      expect(config.enableMetrics).toBe(true);
      expect(config.enableLogs).toBe(false);
      expect(
        config.beforeSend({ message: 'private-counseling-marker' }),
      ).toBeNull();
      expect(
        config.beforeSendMetric({
          name: 'private-counseling-marker',
          type: 'counter',
          value: 1,
        }),
      ).toBeNull();
      expect(
        config.beforeSendMetric({
          name: 'levi.chat.requests',
          type: 'counter',
          value: 1,
          attributes: { outcome: 'ok', summary: 'private-summary-marker' },
        }),
      ).toEqual({
        name: 'levi.chat.requests',
        type: 'counter',
        value: 1,
        attributes: { outcome: 'ok' },
      });
    } finally {
      if (previousDsn === undefined) delete process.env.SENTRY_DSN;
      else process.env.SENTRY_DSN = previousDsn;
      if (previousEnabled === undefined)
        delete process.env.SENTRY_METRICS_ENABLED;
      else process.env.SENTRY_METRICS_ENABLED = previousEnabled;
    }
  });
});
