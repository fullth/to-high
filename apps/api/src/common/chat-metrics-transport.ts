import { randomBytes } from 'node:crypto';
import type {
  Envelope,
  MetricEnvelope,
  SerializedMetric,
  Transport,
} from '@sentry/core';
import { filterChatMetric } from './chat-metrics';

/** The SDK merges scope attributes after beforeSendMetric: scrub again at transport. */
export function filterMetricsEnvelope(envelope: Envelope): Envelope | null {
  const items: MetricEnvelope[1] = [];
  for (const [header, payload] of envelope[1]) {
    if (
      header.type !== 'trace_metric' ||
      !payload ||
      typeof payload !== 'object' ||
      !('items' in payload) ||
      !Array.isArray(payload.items)
    )
      continue;
    const metrics: SerializedMetric[] = [];
    for (const raw of payload.items as SerializedMetric[]) {
      if (!raw || typeof raw !== 'object' || !Number.isFinite(raw.timestamp))
        continue;
      const attributes: Record<string, string> = {};
      for (const key of ['outcome', 'operation', 'token_type']) {
        const attribute = raw.attributes?.[key];
        if (attribute?.type === 'string' && typeof attribute.value === 'string')
          attributes[key] = attribute.value;
      }
      const safe = filterChatMetric({
        name: raw.name,
        type: raw.type,
        value: raw.value,
        unit: raw.unit,
        attributes,
      });
      if (!safe) continue;
      metrics.push({
        timestamp: raw.timestamp,
        trace_id: randomBytes(16).toString('hex'),
        name: safe.name,
        value: safe.value,
        type: safe.type,
        ...(safe.unit ? { unit: safe.unit } : {}),
        attributes: Object.fromEntries(
          Object.entries(safe.attributes || {}).map(([key, value]) => [
            key,
            { type: 'string' as const, value: value as string },
          ]),
        ),
      });
    }
    if (metrics.length)
      items.push([
        {
          type: 'trace_metric',
          item_count: metrics.length,
          content_type: 'application/vnd.sentry.items.trace-metric+json',
        },
        { items: metrics },
      ]);
  }
  return items.length ? [{ sent_at: new Date().toISOString() }, items] : null;
}

export function metricsOnlyTransport(transport: Transport): Transport {
  return {
    send(envelope) {
      const safe = filterMetricsEnvelope(envelope);
      return safe ? transport.send(safe) : Promise.resolve({ statusCode: 200 });
    },
    flush: (timeout) => transport.flush(timeout),
  };
}
