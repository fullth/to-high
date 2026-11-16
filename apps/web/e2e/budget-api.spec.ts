import { expect, test } from "@playwright/test";
import { parseBudgetStatus } from "../src/lib/budget";

const status = {
  balanceMilliWon: 0,
  reservedMilliWon: 0,
  accounting: {
    startedAt: "2026-11-12T00:00:00Z",
    carryoverMilliWon: 0,
    approvedMilliWon: 0,
    settledMilliWon: 0,
  },
  notificationReady: false,
  credits: [],
};

test("budget status accepts zero funds and reports an overrun as a negative balance", () => {
  expect(parseBudgetStatus(status).balanceMilliWon).toBe(0);
  expect(
    parseBudgetStatus({ ...status, balanceMilliWon: -100 }).balanceMilliWon,
  ).toBe(-100);
});

test("budget controls reject incomplete legacy responses and invalid money values", () => {
  expect(() => parseBudgetStatus({ balanceMilliWon: 100 })).toThrow();
  expect(() =>
    parseBudgetStatus({ ...status, reservedMilliWon: -1 }),
  ).toThrow();
  expect(() =>
    parseBudgetStatus({ ...status, balanceMilliWon: "100" }),
  ).toThrow();
  expect(() =>
    parseBudgetStatus({
      ...status,
      credits: [{ amountMilliWon: 10000, at: "invalid" }],
    }),
  ).toThrow();
});

const history = {
  from: '2026-11-01', to: '2026-11-30', firstRecordedAt: '2026-11-16T00:00:00Z',
  days: [{ day: '2026-11-16', requests: { day: '2026-11-16', requests: 4, successes: 2, starts: 1, failures: 1, cancelled: 1, rejected: 0, signedInAccounts: 1, guestNetworks: 1, outcomes: { ok: 2, TIMEOUT: 1, cancelled: 1 } }, model: { settledMilliWon: 53270, reportedCalls: 4, inputTokens: 1000, cachedInputTokens: 500, outputTokens: 100 } }],
};
test('daily history distinguishes absent measurements and validates every nested metric', () => {
  expect(parseBudgetStatus({ ...status, usageHistory: history }).usageHistory?.days[0].requests?.starts).toBe(1);
  expect(parseBudgetStatus({ ...status, usageHistory: { ...history, days: [{ day: '2026-11-16', requests: null, model: null }] } }).usageHistory?.days[0].model).toBeNull();
  for (const invalid of [
    { ...history, days: [history.days[0], history.days[0]] },
    { ...history, days: [{ ...history.days[0], day: '2026-99-99' }] },
    { ...history, days: [{ ...history.days[0], model: { ...history.days[0].model, settledMilliWon: -1 } }] },
    { ...history, days: [{ ...history.days[0], requests: { ...history.days[0].requests, successes: '2' } }] },
    { ...history, days: [{ ...history.days[0], model: { ...history.days[0].model, cachedInputTokens: 2000 } }] },
  ]) expect(() => parseBudgetStatus({ ...status, usageHistory: invalid })).toThrow();
});
