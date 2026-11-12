import {
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type OpenAI from 'openai';
import { BudgetWalletRepository } from './budget-wallet.repository';
import { reserveBudget, settleBudget } from './budget-wallet';
import { randomUUID } from 'node:crypto';
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

export type ModelBudgetReservation = { id: string; price: ModelPrice; rate: number };
type ReportedUsage = Pick<OpenAI.Completions.CompletionUsage, 'prompt_tokens' | 'completion_tokens' | 'prompt_tokens_details'>;

@Injectable()
export class ModelBudgetService {
  constructor(
    private readonly wallets: BudgetWalletRepository,
    private readonly config: ConfigService,
    private readonly alerts: BudgetAlertService,
  ) {}

  async reserve(
    params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
  ): Promise<ModelBudgetReservation> {
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
      Buffer.byteLength(JSON.stringify(params), 'utf8') + 4096;
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
    const id = randomUUID().replaceAll('-', '');
    const result = await this.wallets.transition((wallet) => {
      if (Object.keys(wallet.reservations).length >= 10_000)
        throw new ServiceUnavailableException('미확인 예산을 확인해 주세요.');
      return reserveBudget(wallet, id, amount);
    });
    if (!result) {
      const wallet = await this.wallets.read();
      await this.alerts.blocked(wallet.alertCycle ?? 0);
      throw new ChatFailure('RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }
    return { id, price: { ...price }, rate };
  }

  async settle(reservation: ModelBudgetReservation, usage?: ReportedUsage | null): Promise<void> {
    // A missing or malformed report is not evidence that a failed/cancelled call was free.
    if (!usage) return;
    let cost: number;
    try {
      cost = calculateUsageMilliWon({
        inputTokens: usage.prompt_tokens,
        cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
        cacheWriteTokens: 0,
        outputTokens: usage.completion_tokens,
      }, reservation.price, reservation.rate);
    } catch {
      return;
    }
    await this.wallets.transition((wallet) =>
      Object.hasOwn(wallet.reservations, reservation.id)
        ? settleBudget(wallet, reservation.id, cost)
        : wallet,
    );
  }
}
