import {
  calculateUsageMilliWon,
  koreaWeekStart,
  weeklyAutomaticRefillMilliWon,
} from './weekly-budget-calculation';

describe('weekly budget calculation', () => {
  it('refills 10000 won only when the confirmed balance is zero', () => {
    expect(weeklyAutomaticRefillMilliWon(0)).toBe(10_000_000);
    expect(weeklyAutomaticRefillMilliWon(1)).toBe(0);
    expect(() => weeklyAutomaticRefillMilliWon(-1)).toThrow();
  });
  const price = {
    inputMicroUsd: 2,
    cachedInputMicroUsd: 0.2,
    cacheWriteMicroUsd: 2.5,
    outputMicroUsd: 12,
  };

  it('accounts for cached reads and writes within the input total', () => {
    expect(
      calculateUsageMilliWon(
        {
          inputTokens: 1000,
          cachedInputTokens: 200,
          cacheWriteTokens: 400,
          outputTokens: 500,
        },
        price,
        1500,
      ),
    ).toBe(11760);
  });

  it('rejects token breakdowns larger than the total', () => {
    expect(() =>
      calculateUsageMilliWon(
        {
          inputTokens: 1,
          cachedInputTokens: 1,
          cacheWriteTokens: 1,
          outputTokens: 0,
        },
        price,
        1500,
      ),
    ).toThrow();
  });

  it('switches week at Monday midnight in Seoul', () => {
    expect(koreaWeekStart(new Date('2026-11-08T14:59:59Z')).toISOString()).toBe(
      '2026-11-01T15:00:00.000Z',
    );
    expect(koreaWeekStart(new Date('2026-11-08T15:00:00Z')).toISOString()).toBe(
      '2026-11-08T15:00:00.000Z',
    );
  });
});
