import { BudgetWalletRepository } from './budget-wallet.repository';
import type { BudgetWallet } from './budget-wallet';

describe('budget wallet initialization and migration', () => {
  function repository(initial: BudgetWallet | null = null) {
    let stored = initial;
    const collection = {
      updateOne: async (
        filter: { version?: number },
        update: { $set?: Partial<BudgetWallet>; $setOnInsert?: BudgetWallet },
      ) => {
        if (!stored && update.$setOnInsert)
          stored = structuredClone(update.$setOnInsert);
        if (filter.version !== undefined && filter.version !== stored?.version)
          return { modifiedCount: 0 };
        if (stored && update.$set)
          stored = { ...stored, ...structuredClone(update.$set) };
        return { modifiedCount: 1 };
      },
      findOne: async () =>
        stored ? { ...structuredClone(stored), _id: 'weekly-wallet' } : null,
    };
    return new BudgetWalletRepository({
      db: { collection: () => collection },
    } as never);
  }

  it('never grants a new installation an unapproved initial allowance', async () => {
    const repo = repository();
    const wallet = await repo.transition((state) => state);
    expect(wallet?.balance).toBe(0);
    expect(wallet?.credits).toEqual({});
    expect(wallet?.accounting?.approvedMilliWon).toBe(0);
  });

  it('carries over remaining funds and reservations once without calendar refill', async () => {
    const repo = repository({
      version: 7,
      balance: 500,
      reservations: { unknown: 100 },
      evaluatedWeek: '2020-01-01T00:00:00.000Z',
    });
    const first = await repo.transition((state) => state);
    const second = await repo.transition((state) => state);
    expect(first).toEqual(second);
    expect(first?.balance).toBe(500);
    expect(first?.reservations).toEqual({ unknown: 100 });
    expect(first?.accounting).toMatchObject({
      carryoverMilliWon: 600,
      approvedMilliWon: 0,
      settledMilliWon: 0,
    });
    const empty = repository({
      version: 1,
      balance: 0,
      reservations: {},
      evaluatedWeek: '2020-01-01T00:00:00.000Z',
    });
    expect((await empty.transition((state) => state))?.balance).toBe(0);
  });
});
