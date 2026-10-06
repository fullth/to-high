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
});
