import {
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type OpenAI from 'openai';
import { BudgetWalletRepository } from './budget-wallet.repository';
import { spendBudget } from './budget-wallet';
import {
  calculateUsageMilliWon,
  type ModelPrice,
} from './weekly-budget-calculation';
import { ChatFailure } from './chat-failure';
import { BudgetAlertService } from './budget-alert.service';

const prices: Record<string, ModelPrice> = {
  'gpt-6.1-terra': {
    inputMicroUsd: 1,
    cachedInputMicroUsd: 0.05,
    cacheWriteMicroUsd: 1.25,
    outputMicroUsd: 5,
  },
  'gpt-6-luna': {
    inputMicroUsd: 0.1,
    cachedInputMicroUsd: 0.01,
    cacheWriteMicroUsd: 0.125,
    outputMicroUsd: 0.5,
  },
};

@Injectable()
export class ModelBudgetService {
  constructor(
    private readonly wallets: BudgetWalletRepository,
    private readonly config: ConfigService,
    private readonly alerts: BudgetAlertService,
  ) {}

  async reserve(
    params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
  ): Promise<void> {
    const price = prices[params.model];
    const rate = Number(this.config.get('AI_BUDGET_KRW_PER_USD') || 1500);
    const output = params.max_completion_tokens;
    if (
      !price ||
      !Number.isSafeInteger(rate) ||
      rate < 1 ||
      !Number.isSafeInteger(output) ||
      !output ||
      output < 1
    )
      throw new ServiceUnavailableException('예산 계산 설정을 확인해 주세요.');
    // Byte count plus protocol overhead is a conservative estimate, not a provider guarantee.
    const input =
      Buffer.byteLength(JSON.stringify(params.messages), 'utf8') + 4096;
    const amount = calculateUsageMilliWon(
      {
        inputTokens: input,
        cachedInputTokens: 0,
        cacheWriteTokens: input,
        outputTokens: output,
      },
      price,
      rate,
    );
    const result = await this.wallets.transition((wallet) =>
      spendBudget(wallet, amount),
    );
    if (!result) {
      const wallet = await this.wallets.read();
      await this.alerts.blocked(wallet.alertCycle ?? 0);
      throw new ChatFailure('RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
