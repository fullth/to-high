import type { Envelope } from '@sentry/core';
import {
  filterMetricsEnvelope,
  metricsOnlyTransport,
} from './chat-metrics-transport';

describe('final Sentry transport boundary', () => {
  const envelope = () =>
    [
      { trace: { user: 'private-counseling-marker' } },
      [
        [
          { type: 'event' },
          { request: { data: { messages: ['private-counseling-marker'] } } },
        ],
        [{ type: 'log' }, { items: [{ body: 'private-counseling-marker' }] }],
        [
          {
            type: 'trace_metric',
            item_count: 1,
            content_type: 'application/vnd.sentry.items.trace-metric+json',
          },
          {
            items: [
              {
                timestamp: 100,
                trace_id: 'private-session-marker',
                span_id: 'private-span',
                name: 'levi.chat.requests',
                type: 'counter',
                value: 1,
                attributes: {
                  outcome: { type: 'string', value: 'ok' },
                  'user.id': { type: 'string', value: 'private-owner' },
                  'counseling.text': {
                    type: 'string',
                    value: 'private-counseling-marker',
                  },
                  summary: { type: 'string', value: 'private-summary' },
                },
              },
            ],
          },
        ],
      ],
    ] as unknown as Envelope;

  it('drops nonmetrics and scope attributes added after beforeSendMetric', () => {
    const safe = filterMetricsEnvelope(envelope());
    expect(safe?.[1]).toHaveLength(1);
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain('private-');
    expect(serialized).not.toContain('user.id');
    expect(serialized).toContain('levi.chat.requests');
    expect(serialized).toContain('outcome');
  });
  it('never forwards an event-only envelope', async () => {
    const send = jest.fn().mockResolvedValue({ statusCode: 200 });
    const flush = jest.fn().mockResolvedValue(true);
    const transport = metricsOnlyTransport({ send, flush });
    await transport.send([
      {},
      [[{ type: 'event' }, { message: 'private-counseling-marker' }]],
    ]);
    expect(send).not.toHaveBeenCalled();
    await transport.send(envelope());
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(send.mock.calls)).not.toContain('private-');
    await transport.flush(100);
    expect(flush).toHaveBeenCalledWith(100);
  });
});
