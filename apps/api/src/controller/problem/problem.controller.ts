import { Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BudgetAlertService } from '../../common/budget-alert.service';

@Controller('problem')
export class ProblemController {
  constructor(private readonly alerts: BudgetAlertService) {}

  @Post('report')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async report() {
    const state = await this.alerts.reportProblem();
    return { state };
  }
}
