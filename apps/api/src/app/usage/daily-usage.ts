import { CHAT_ERROR_CODES } from '../../common/chat-failure';

export const requestOutcomes = [
  'ok',
  'cancelled',
  ...CHAT_ERROR_CODES,
] as const;
export type RequestOutcome = (typeof requestOutcomes)[number];

export function koreanDay(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function requestCounters(
  outcome: string,
  firstTurn: boolean,
  rejected: boolean,
) {
  const safeOutcome =
    requestOutcomes.find((value) => value === outcome) ?? 'UNAVAILABLE';
  return {
    requests: 1,
    successes: safeOutcome === 'ok' && !rejected ? 1 : 0,
    starts: safeOutcome === 'ok' && firstTurn && !rejected ? 1 : 0,
    failures:
      safeOutcome !== 'ok' && safeOutcome !== 'cancelled' && !rejected ? 1 : 0,
    cancelled: safeOutcome === 'cancelled' ? 1 : 0,
    rejected: rejected ? 1 : 0,
    [`outcomes.${safeOutcome}`]: 1,
  };
}

export type DailyRequestUsage = {
  day: string;
  requests: number;
  successes: number;
  starts: number;
  failures: number;
  cancelled: number;
  rejected: number;
  signedInAccounts: number;
  guestNetworks: number;
  outcomes: Partial<Record<RequestOutcome, number>>;
};

export type DailyModelUsage = {
  settledMilliWon: number;
  reportedCalls: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};
