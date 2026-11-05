import {
  chargeBudget,
  evaluateWeeklyRefill,
  reserveBudget,
  settleBudget,
  type BudgetWallet,
} from './budget-wallet';

describe('budget wallet transitions', () => {
  const wallet: BudgetWallet = {
    version: 1,
    balance: 1000,
    reservations: {},
    evaluatedWeek: '2026-11-01T15:00:00.000Z',
  };
  it('reserves before a call and returns only the unused amount', () => {
    const reserved = reserveBudget(wallet, 'call', 800)!;
    expect(reserved.balance).toBe(200);
    expect(reserveBudget(reserved, 'other', 201)).toBeNull();
    expect(settleBudget(reserved, 'call', 500).balance).toBe(500);
    expect(() => settleBudget(reserved, 'call', 801)).toThrow();
  });
  it('keeps an uncertain charge reserved', () => {
    const reserved = reserveBudget(wallet, 'call', 800)!;
    expect(settleBudget(reserved, 'call', null)).toEqual(reserved);
    expect(() => settleBudget(wallet, 'call', 0)).toThrow();
  });
  it('refills once only for zero balance without reservations', () => {
    const empty = { ...wallet, balance: 0 };
    const next = evaluateWeeklyRefill(empty, '2026-11-08T15:00:00.000Z');
    expect(next.balance).toBe(10_000_000);
    expect(evaluateWeeklyRefill(next, next.evaluatedWeek)).toEqual(next);
    expect(
      evaluateWeeklyRefill(
        { ...empty, reservations: { x: 1 } },
        next.evaluatedWeek,
      ).balance,
    ).toBe(0);
    expect(evaluateWeeklyRefill(wallet, next.evaluatedWeek).balance).toBe(1000);
  });
  it('allows positive manual topups and rejects invalid amounts', () => {
    expect(chargeBudget(wallet, 10_000_000).balance).toBe(10_001_000);
    expect(() => chargeBudget(wallet, 0)).toThrow();
  });
});
