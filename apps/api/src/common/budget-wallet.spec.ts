import {
  chargeBudget,
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
    expect(settleBudget(reserved, 'call', 1001).balance).toBe(-1);
  });
  it('keeps an uncertain charge reserved', () => {
    const reserved = reserveBudget(wallet, 'call', 800)!;
    expect(settleBudget(reserved, 'call', null)).toEqual(reserved);
    expect(() => settleBudget(wallet, 'call', 0)).toThrow();
  });
  it('allows positive manual topups and rejects invalid amounts', () => {
    expect(chargeBudget(wallet, 10_000_000).balance).toBe(10_001_000);
    expect(() => chargeBudget(wallet, 0)).toThrow();
  });
  it('keeps the accounting identity across approval, reservation and settlement', () => {
    const tracked = { ...wallet, accounting: {
      startedAt: '2026-11-12T00:00:00Z', carryoverMilliWon: 1000,
      approvedMilliWon: 0, settledMilliWon: 0,
    } };
    const approved = chargeBudget(tracked, 10_000_000, { id: 'a'.repeat(32), actor: 'admin', at: '2026-11-12T00:01:00Z' });
    expect(chargeBudget(approved, 10_000_000, { id: 'a'.repeat(32), actor: 'admin', at: '2026-11-12T00:02:00Z' })).toBe(approved);
    const reserved = reserveBudget(approved, 'call', 800)!;
    const settled = settleBudget(reserved, 'call', 500);
    expect(settled.accounting?.approvedMilliWon).toBe(10_000_000);
    expect(settled.accounting?.settledMilliWon).toBe(500);
    expect(settled.balance).toBe(10_000_500);
  });
});
