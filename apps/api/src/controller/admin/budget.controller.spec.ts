import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BudgetController } from './budget.controller';
import { BudgetWalletRepository } from '../../common/budget-wallet.repository';
import { UsageOverviewService } from '../../common/usage-overview.service';
import type { BudgetWallet } from '../../common/budget-wallet';

describe('budget administration', () => {
  let wallet: BudgetWallet;
  let controller: BudgetController;
  const request = { user: { userId: 'administrator' } };
  beforeEach(() => {
    wallet = {
      version: 0,
      balance: 0,
      reservations: {},
      evaluatedWeek: '2026-11-01T15:00:00.000Z',
    };
    const repository = {
      transition: async (
        change: (state: BudgetWallet) => BudgetWallet | null,
      ) => {
        const next = change(wallet);
        if (next) wallet = next;
        return next;
      },
    };
    controller = new BudgetController(
      repository as unknown as BudgetWalletRepository,
      { get: () => 'administrator' } as unknown as ConfigService,
      { todayUsage: async () => ({ countedTurns: 0, signedInAccounts: 0, guestNetworks: 0 }) } as unknown as UsageOverviewService,
    );
  });
  it('rejects an authenticated user who is not an administrator', async () => {
    await expect(
      controller.status({ user: { userId: 'other' } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.topup(
        { user: { userId: 'other' } },
        { amountWon: 10000, operationId: 'a'.repeat(32) },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(wallet.balance).toBe(0);
  });
  it('does not double charge a retried request and rejects conflicting reuse', async () => {
    const input = { amountWon: 10000, operationId: 'a'.repeat(32) };
    await controller.topup(request, input);
    await controller.topup(request, input);
    expect(wallet.balance).toBe(10_000_000);
    await expect(
      controller.topup(request, { ...input, amountWon: 20000 }),
    ).rejects.toThrow();
    expect(wallet.balance).toBe(10_000_000);
  });
});
