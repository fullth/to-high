import { ConfigService } from '@nestjs/config';
import { ModelBudgetService } from './model-budget.service';
import { BudgetWalletRepository } from './budget-wallet.repository';
import type { BudgetWallet } from './budget-wallet';

describe('model budget boundary', () => {
  let wallet: BudgetWallet;
  let service: ModelBudgetService;
  const request = {
    model: 'gpt-6.1-terra',
    messages: [{ role: 'user' as const, content: '안녕하세요' }],
    max_completion_tokens: 100,
  };
  beforeEach(() => {
    wallet = {
      version: 0,
      balance: 10_000_000,
      reservations: {},
      evaluatedWeek: '2026-11-01T15:00:00.000Z',
    };
    const store = {
      read: async () => wallet,
      transition: async (change: (w: BudgetWallet) => BudgetWallet | null) => {
        const next = change(wallet);
        if (next) wallet = next;
        return next;
      },
    };
    service = new ModelBudgetService(
      store as unknown as BudgetWalletRepository,
      { get: () => undefined } as unknown as ConfigService,
      { blocked: async () => {} } as never,
    );
  });
  it('reserves before dispatch and settles cache-aware reported usage once', async () => {
    const reservation = await service.reserve(request);
    expect(wallet.reservations[reservation.id]).toBeGreaterThan(0);
    expect(wallet.balance).toBeLessThan(10_000_000);
    const usage = { prompt_tokens: 200, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 128 } };
    await service.settle(reservation, usage);
    expect(wallet.reservations).toEqual({});
    expect(wallet.balance).toBe(10_000_000 - 268);
    await service.settle(reservation, usage);
    expect(wallet.balance).toBe(10_000_000 - 268);
  });
  it('retains uncertain reservations for missing or invalid usage', async () => {
    const reservation = await service.reserve(request);
    const balance = wallet.balance;
    await service.settle(reservation, null);
    await service.settle(reservation, { prompt_tokens: 1, completion_tokens: -1 });
    expect(wallet.balance).toBe(balance);
    expect(wallet.reservations[reservation.id]).toBeGreaterThan(0);
  });
  it('refuses unknown models and insufficient funds before dispatch', async () => {
    await expect(
      service.reserve({ ...request, model: 'unknown' }),
    ).rejects.toThrow();
    wallet.balance = 1;
    await expect(service.reserve(request)).rejects.toThrow();
    expect(wallet.reservations).toEqual({});
  });
});
