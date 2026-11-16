import { DailyUsageRepository } from '../persistence/usage/daily-usage.repository';
import { DailyUsageService } from '../app/usage/daily-usage.service';
import { Module } from '@nestjs/common';
import { BudgetWalletRepository } from './budget-wallet.repository';
import { ModelBudgetService } from './model-budget.service';
import { BudgetAlertService } from './budget-alert.service';
import { DailyTurnLimitService } from './daily-turn-limit.service';
import { UsageOverviewService } from './usage-overview.service';
import { IncidentService } from './incident.service';
import { BudgetAdminService } from '../app/admin/budget-admin.service';

@Module({
  providers: [
    DailyUsageRepository,
    DailyUsageService,
    BudgetAdminService,
    BudgetWalletRepository,
    ModelBudgetService,
    BudgetAlertService,
    DailyTurnLimitService,
    UsageOverviewService,
    IncidentService,
  ],
  exports: [
    DailyUsageService,
    BudgetAdminService,
    BudgetWalletRepository,
    ModelBudgetService,
    DailyTurnLimitService,
    BudgetAlertService,
    UsageOverviewService,
    IncidentService,
  ],
})
export class BudgetModule {}
