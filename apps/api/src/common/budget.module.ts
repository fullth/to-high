import { Module } from '@nestjs/common';
import { BudgetWalletRepository } from './budget-wallet.repository';
import { ModelBudgetService } from './model-budget.service';
import { BudgetAlertService } from './budget-alert.service';
import { DailyTurnLimitService } from './daily-turn-limit.service';
import { UsageOverviewService } from './usage-overview.service';
import { IncidentService } from './incident.service';

@Module({
  providers: [
    BudgetWalletRepository,
    ModelBudgetService,
    BudgetAlertService,
    DailyTurnLimitService,
    UsageOverviewService,
    IncidentService,
  ],
  exports: [
    BudgetWalletRepository,
    ModelBudgetService,
    DailyTurnLimitService,
    BudgetAlertService,
    UsageOverviewService,
    IncidentService,
  ],
})
export class BudgetModule {}
