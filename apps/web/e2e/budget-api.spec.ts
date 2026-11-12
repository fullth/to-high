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
