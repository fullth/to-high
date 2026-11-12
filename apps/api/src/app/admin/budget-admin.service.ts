import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BudgetWalletRepository } from '../../common/budget-wallet.repository';
import { UsageOverviewService } from '../../common/usage-overview.service';
import { chargeBudget } from '../../common/budget-wallet';
import { BUDGET_APPROVAL_MILLI_WON } from '../../common/weekly-budget-calculation';

@Injectable()
export class BudgetAdminService {
  constructor(
    private readonly wallets: BudgetWalletRepository,
    private readonly config: ConfigService,
    private readonly usage: UsageOverviewService,
  ) {}

  private authorize(id: string): void {
    const allowed = (
      this.config.get<string>('TO_HIGH_BUDGET_ADMIN_USER_IDS') || ''
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (allowed.length !== 1 || !id || allowed[0] !== id)
      throw new ForbiddenException();
  }

  async status(actor: string) {
    this.authorize(actor);
    const wallet = await this.wallets.transition((state) => state);
    if (!wallet || !wallet.accounting) throw new ServiceUnavailableException();
    return {
      balanceMilliWon: wallet.balance,
      accounting: wallet.accounting,
      todayUsage: await this.usage.todayUsage(),
      reservedMilliWon: Object.values(wallet.reservations).reduce(
        (sum, amount) => sum + amount,
        0,
      ),
      notificationReady: Boolean(
        this.config.get<string>('GMAIL_USER') &&
        this.config.get<string>('GMAIL_APP_PASSWORD') &&
        this.config.get<string>('BUDGET_ALERT_RECIPIENT'),
      ),
      credits: Object.entries(wallet.credits || {})
        .sort((a, b) => b[1].at.localeCompare(a[1].at))
        .slice(0, 20)
        .map(([id, { amount, at, actor: approver }]) => ({
          amountMilliWon: amount,
          at,
          actor: approver,
          kind:
            id === 'initial'
              ? 'initial'
              : approver === 'system'
                ? 'automatic'
                : 'manual',
        })),
    };
  }

  async topup(actor: string, operationId: string) {
    this.authorize(actor);
    const wallet = await this.wallets.transition((state) =>
      chargeBudget(state, BUDGET_APPROVAL_MILLI_WON, {
        id: operationId,
        actor,
        at: new Date().toISOString(),
      }),
    );
    if (!wallet) throw new ServiceUnavailableException();
    return { balanceMilliWon: wallet.balance };
  }
}
