export type BudgetStatus = {
  balanceMilliWon: number;
  reservedMilliWon: number;
  accounting: {
    startedAt: string;
    carryoverMilliWon: number;
    approvedMilliWon: number;
    settledMilliWon: number;
  };
  notificationReady: boolean;
  todayUsage?: {
    countedTurns: number;
    signedInAccounts: number;
    guestNetworks: number;
  };
  credits: {
    amountMilliWon: number;
    at: string;
    actor: string;
    kind: "initial" | "automatic" | "manual";
  }[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isBudgetStatus(value: unknown): value is BudgetStatus {
  if (!isObject(value)) return false;
  const { accounting, todayUsage, credits } = value;
  return (
    typeof value.balanceMilliWon === "number" &&
    Number.isSafeInteger(value.balanceMilliWon) &&
    isAmount(value.reservedMilliWon) &&
    typeof value.notificationReady === "boolean" &&
    isObject(accounting) &&
    isDate(accounting.startedAt) &&
    isAmount(accounting.carryoverMilliWon) &&
    isAmount(accounting.approvedMilliWon) &&
    isAmount(accounting.settledMilliWon) &&
    (todayUsage === undefined ||
      (isObject(todayUsage) &&
        isAmount(todayUsage.countedTurns) &&
        isAmount(todayUsage.signedInAccounts) &&
        isAmount(todayUsage.guestNetworks))) &&
    Array.isArray(credits) &&
    credits.every(
      (item: unknown) =>
        isObject(item) &&
        isAmount(item.amountMilliWon) &&
        isDate(item.at) &&
        typeof item.actor === "string" &&
        ["initial", "automatic", "manual"].includes(String(item.kind)),
    )
  );
}

export function parseBudgetStatus(value: unknown): BudgetStatus {
  if (!isBudgetStatus(value)) {
    throw new Error("예산 응답 형식을 확인할 수 없습니다.");
  }
  return value;
}
