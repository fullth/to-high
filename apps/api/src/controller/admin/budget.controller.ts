import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { BudgetWalletRepository } from '../../common/budget-wallet.repository';
import { UsageOverviewService } from '../../common/usage-overview.service';
import { chargeBudget } from '../../common/budget-wallet';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';

const TopupSchema = z
  .object({
    amountWon: z.number().int().min(1).max(1_000_000),
    operationId: z.string().regex(/^[a-f0-9]{32}$/),
  })
  .strict();
type RequestUser = { user: { userId: string } };

@Controller('admin/budget')
@UseGuards(AuthGuard('jwt'))
export class BudgetController {
  constructor(
    private readonly wallets: BudgetWalletRepository,
    private readonly config: ConfigService,
    private readonly usage: UsageOverviewService,
  ) {}

  private authorize(request: RequestUser): string {
    const id = request.user?.userId;
    const allowed = (
      this.config.get<string>('TO_HIGH_BUDGET_ADMIN_USER_IDS') || ''
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!id || !allowed.includes(id)) throw new ForbiddenException();
    return id;
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async status(@Req() request: RequestUser) {
    this.authorize(request);
    const wallet = await this.wallets.transition((state) => state);
    if (!wallet) throw new Error('Budget unavailable');
    return {
      balanceMilliWon: wallet.balance,
      todayUsage: await this.usage.todayUsage(),
      reservedMilliWon: Object.values(wallet.reservations).reduce(
        (sum, amount) => sum + amount,
        0,
      ),
      evaluatedWeek: wallet.evaluatedWeek,
      notificationReady: Boolean(
        this.config.get<string>('GMAIL_USER') &&
        this.config.get<string>('GMAIL_APP_PASSWORD') &&
        this.config.get<string>('BUDGET_ALERT_RECIPIENT'),
      ),
      credits: Object.entries(wallet.credits || {})
        .sort((a, b) => b[1].at.localeCompare(a[1].at))
        .slice(0, 20)
        .map(([id, { amount, at, actor }]) => ({ amountMilliWon: amount, at, kind: id === 'initial' ? 'initial' : actor === 'system' ? 'automatic' : 'manual' })),
    };
  }

  @Post('topups')
  @Header('Cache-Control', 'no-store')
  async topup(
    @Req() request: RequestUser,
    @Body(new ZodValidationPipe(TopupSchema)) body: z.infer<typeof TopupSchema>,
  ) {
    const actor = this.authorize(request);
    const at = new Date().toISOString();
    const wallet = await this.wallets.transition((state) =>
      chargeBudget(state, body.amountWon * 1000, {
        id: body.operationId,
        actor,
        at,
      }),
    );
    if (!wallet) throw new Error('Budget unavailable');
    return { balanceMilliWon: wallet.balance };
  }
}
