import { Module } from '@nestjs/common';
import { BudgetWalletRepository } from './budget-wallet.repository';
import { ModelBudgetService } from './model-budget.service';
import { BudgetAlertService } from './budget-alert.service';
import { DailyTurnLimitService } from './daily-turn-limit.service';

@Module({
  providers: [BudgetWalletRepository, ModelBudgetService, BudgetAlertService, DailyTurnLimitService],
  exports: [BudgetWalletRepository, ModelBudgetService, DailyTurnLimitService],
})
export class BudgetModule {}
