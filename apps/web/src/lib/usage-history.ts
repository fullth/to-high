export type RequestUsage = {
  day: string;
  requests: number;
  successes: number;
  starts: number;
  failures: number;
  cancelled: number;
  rejected: number;
  signedInAccounts: number;
  guestNetworks: number;
  outcomes: Record<string, number>;
};
export type ModelUsage = {
  settledMilliWon: number;
  reportedCalls: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};
export type UsageHistory = {
  from: string;
  to: string;
  firstRecordedAt: string | null;
  days: {
    day: string;
    requests: RequestUsage | null;
    model: ModelUsage | null;
  }[];
};
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const outcomes = new Set([
  "ok",
  "cancelled",
  "TIMEOUT",
  "RATE_LIMITED",
  "DAILY_GUEST_LIMIT",
  "DAILY_USER_LIMIT",
  "BUSY",
  "UNAVAILABLE",
  "AUTH_REQUIRED",
  "INVALID_INPUT",
  "SUMMARY_FAILED",
  "INTERRUPTED",
]);
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const day = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function isUsageHistory(value: unknown): value is UsageHistory {
  if (
    !object(value) ||
    !day(value.from) ||
    !day(value.to) ||
    value.from > value.to ||
    !(
      value.firstRecordedAt === null ||
      (typeof value.firstRecordedAt === "string" &&
        Number.isFinite(Date.parse(value.firstRecordedAt)))
    ) ||
    !Array.isArray(value.days) ||
    value.days.length > 30
  )
    return false;
  const from = value.from,
    to = value.to;
  const seen = new Set<string>();
  return value.days.every((item: unknown) => {
    if (
      !object(item) ||
      !day(item.day) ||
      item.day < from ||
      item.day > to ||
      seen.has(item.day)
    )
      return false;
    seen.add(item.day);
    const r = item.requests,
      m = item.model;
    return (
      (r === null ||
        (object(r) &&
          r.day === item.day &&
          [
            "requests",
            "successes",
            "starts",
            "failures",
            "cancelled",
            "rejected",
            "signedInAccounts",
            "guestNetworks",
          ].every((k) => count(r[k])) &&
          object(r.outcomes) &&
          Object.entries(r.outcomes).every(
            ([key, value]) => outcomes.has(key) && count(value),
          ) &&
          Number(r.starts) <= Number(r.successes) &&
          Number(r.successes) <= Number(r.requests))) &&
      (m === null ||
        (object(m) &&
          [
            "settledMilliWon",
            "reportedCalls",
            "inputTokens",
            "outputTokens",
            "cachedInputTokens",
          ].every((k) => count(m[k])) &&
          Number(m.cachedInputTokens) <= Number(m.inputTokens)))
    );
  });
}
