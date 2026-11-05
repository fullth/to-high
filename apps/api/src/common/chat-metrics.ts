import * as Sentry from '@sentry/nestjs';
import type { Metric } from '@sentry/core';

const names = new Set([
  'levi.chat.requests',
  'levi.chat.duration',
  'levi.chat.first_token',
  'levi.chat.summaries',
  'levi.ai.tokens',
  'levi.ai.calls',
  'levi.chat.rejected',
  'levi.chat.options',
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
  operation: [
    'reply',
    'options',
    'question',
    'summary',
    'empathy',
    'feedback',
    'profile',
    'import',
  ],
  model: ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-6.1-terra', 'gpt-6-luna'],
  usage_status: ['reported', 'missing', 'failed', 'cancelled'],
  token_type: ['input', 'output', 'cached_input'],
  option_result: [
    'generated',
    'invalid_output',
    'provider_error',
    'deadline',
    'cancelled',
  ],
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

export type ModelOperation =
  | 'reply'
  | 'options'
  | 'question'
  | 'summary'
  | 'empathy'
  | 'feedback'
  | 'profile'
  | 'import';
type ModelUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
};

export function recordModelUsage(
  operation: ModelOperation,
  model: string,
  status: 'reported' | 'missing' | 'failed' | 'cancelled',
  usage?: ModelUsage | null,
) {
  const attributes = {
    operation,
    model,
    usage_status: usage ? 'reported' : status,
  };
  Sentry.metrics.count('levi.ai.calls', 1, { attributes });
  if (!usage) return;
  for (const [token_type, value] of Object.entries({
    input: usage.prompt_tokens,
    output: usage.completion_tokens,
    cached_input: usage.prompt_tokens_details?.cached_tokens,
  })) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
      Sentry.metrics.count('levi.ai.tokens', value, {
        attributes: { operation, model, token_type },
      });
  }
}

export function recordSummary() {
  Sentry.metrics.count('levi.chat.summaries', 1);
}
export function recordOptionsResult(
  option_result:
    | 'generated'
    | 'invalid_output'
    | 'provider_error'
    | 'deadline'
    | 'cancelled',
) {
  Sentry.metrics.count('levi.chat.options', 1, {
    attributes: { option_result },
  });
}
export function recordRejected(outcome: string) {
  Sentry.metrics.count('levi.chat.rejected', 1, { attributes: { outcome } });
}
