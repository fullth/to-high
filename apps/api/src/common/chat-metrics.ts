import * as Sentry from '@sentry/nestjs';
import type { Metric } from '@sentry/core';

const names = new Set([
  'levi.chat.requests',
  'levi.chat.duration',
  'levi.chat.first_token',
  'levi.chat.summaries',
  'levi.ai.tokens',
  'levi.chat.rejected',
]);
const values: Record<string, readonly string[]> = {
  outcome: [
    'ok',
    'TIMEOUT',
    'RATE_LIMITED',
    'BUSY',
    'UNAVAILABLE',
    'AUTH_REQUIRED',
    'INVALID_INPUT',
    'SUMMARY_FAILED',
    'INTERRUPTED',
    'cancelled',
  ],
  operation: ['reply', 'options', 'summary'],
  token_type: ['input', 'output'],
};

/** Rebuild metrics from an allowlist; never forward inherited SDK scope data. */
export function filterChatMetric(metric: Metric): Metric | null {
  if (
    !names.has(metric.name) ||
    !Number.isFinite(metric.value) ||
    metric.value < 0
  )
    return null;
  if (!['counter', 'distribution'].includes(metric.type)) return null;
  const attributes: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(values)) {
    const value = metric.attributes?.[key];
    if (typeof value === 'string' && allowed.includes(value))
      attributes[key] = value;
  }
  return {
    name: metric.name,
    value: metric.value,
    type: metric.type,
    ...(metric.unit === 'millisecond' ? { unit: metric.unit } : {}),
    attributes,
  };
}

export function recordChatRequest(
  outcome: string,
  duration: number,
  firstToken?: number,
) {
  Sentry.metrics.count('levi.chat.requests', 1, { attributes: { outcome } });
  Sentry.metrics.distribution('levi.chat.duration', duration, {
    unit: 'millisecond',
    attributes: { outcome },
  });
  if (firstToken !== undefined)
    Sentry.metrics.distribution('levi.chat.first_token', firstToken, {
      unit: 'millisecond',
    });
}

export function recordModelUsage(
  operation: 'reply' | 'options' | 'summary',
  usage?: { prompt_tokens: number; completion_tokens: number } | null,
) {
  if (!usage) return;
  Sentry.metrics.count('levi.ai.tokens', usage.prompt_tokens, {
    attributes: { operation, token_type: 'input' },
  });
  Sentry.metrics.count('levi.ai.tokens', usage.completion_tokens, {
    attributes: { operation, token_type: 'output' },
  });
}

export function recordSummary() {
  Sentry.metrics.count('levi.chat.summaries', 1);
}
export function recordRejected(outcome: string) {
  Sentry.metrics.count('levi.chat.rejected', 1, { attributes: { outcome } });
}
