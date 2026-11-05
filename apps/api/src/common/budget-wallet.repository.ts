import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { BudgetWallet } from './budget-wallet';
import { evaluateWeeklyRefill } from './budget-wallet';
import {
  DEFAULT_REFILL_MILLI_WON,
  koreaWeekStart,
} from './weekly-budget-calculation';

type StoredWallet = BudgetWallet & { _id: 'weekly-wallet' };

/** The version check makes a balance transition atomic across API instances. */
@Injectable()
export class BudgetWalletRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private get collection() {
    if (!this.connection.db)
      throw new ServiceUnavailableException(
        '예산 저장소를 사용할 수 없습니다.',
      );
    return this.connection.db.collection<StoredWallet>('ai_budget_wallet');
  }

  async read(): Promise<BudgetWallet> {
    const collection = this.collection;
    const now = new Date();
    const week = koreaWeekStart(now).toISOString();
    await collection
      .updateOne(
        { _id: 'weekly-wallet' },
        {
          $setOnInsert: {
            version: 0,
            balance: DEFAULT_REFILL_MILLI_WON,
            reservations: {},
            evaluatedWeek: week,
            credits: { initial: { amount: DEFAULT_REFILL_MILLI_WON, actor: 'system', at: now.toISOString() } },
          },
        },
        { upsert: true, writeConcern: { w: 'majority' } },
      )
      .catch(async (error: unknown) => {
        if (
          !(
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 11000
          )
        )
          throw error;
      });
    const wallet = await collection.findOne({ _id: 'weekly-wallet' });
    if (!wallet)
      throw new ServiceUnavailableException('예산을 불러올 수 없습니다.');
    const { _id, ...state } = wallet;
    void _id;
    return state;
  }

  async transition(
    change: (current: BudgetWallet) => BudgetWallet | null,
  ): Promise<BudgetWallet | null> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const before = await this.read();
      const now = new Date();
      const currentWeek = koreaWeekStart(now).toISOString();
      const evaluated = evaluateWeeklyRefill(
        before,
        currentWeek,
        now.toISOString(),
      );
      if (evaluated !== before) {
        await this.collection.updateOne(
          { _id: 'weekly-wallet', version: before.version },
          { $set: evaluated },
          { writeConcern: { w: 'majority' } },
        );
        continue;
      }
      const after = change(before);
      if (!after || after === before) return after;
      if (after.version !== before.version + 1)
        throw new Error('Invalid wallet version');
      const result = await this.collection.updateOne(
        { _id: 'weekly-wallet', version: before.version },
        { $set: after },
        { writeConcern: { w: 'majority' } },
      );
      if (result.modifiedCount === 1) return after;
    }
    throw new ServiceUnavailableException(
      '예산 동시 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    );
  }
}
