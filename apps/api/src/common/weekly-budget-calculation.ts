/** Costs are kept in milli-won to avoid rounding each model call down to zero. */
export const BUDGET_APPROVAL_MILLI_WON = 10_000_000;

export type ModelPrice = {
  inputMicroUsd: number;
  cachedInputMicroUsd: number;
  cacheWriteMicroUsd: number;
  outputMicroUsd: number;
};

export type UsageBreakdown = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
};

export function calculateUsageMilliWon(
  usage: UsageBreakdown,
  price: ModelPrice,
  wonPerDollar: number,
): number {
  const integers = [...Object.values(usage), wonPerDollar];
  if (
    integers.some((value) => !Number.isSafeInteger(value) || value < 0) ||
    wonPerDollar === 0
  )
    throw new Error('Invalid usage or exchange rate');
  if (
    Object.values(price).some((value) => !Number.isFinite(value) || value < 0)
  )
    throw new Error('Invalid model price');
  const ordinary =
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens;
  if (ordinary < 0) throw new Error('Invalid input token breakdown');
  const microUsd =
    ordinary * price.inputMicroUsd +
    usage.cachedInputTokens * price.cachedInputMicroUsd +
    usage.cacheWriteTokens * price.cacheWriteMicroUsd +
    usage.outputTokens * price.outputMicroUsd;
  const milliWon = Math.ceil((microUsd * wonPerDollar) / 1000);
  if (!Number.isSafeInteger(milliWon))
    throw new Error('Usage cost exceeds safe range');
  return milliWon;
}

/** Monday 00:00 in Korea, returned as an unambiguous UTC instant. */
export function koreaWeekStart(now: Date): Date {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid date');
  const korea = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = (korea.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(
      korea.getUTCFullYear(),
      korea.getUTCMonth(),
      korea.getUTCDate() - day,
    ) -
      9 * 60 * 60 * 1000,
  );
}
