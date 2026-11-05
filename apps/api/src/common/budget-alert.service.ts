import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Connection } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { BudgetWalletRepository } from './budget-wallet.repository';

type Alert = {
  _id: string;
  kind: 'low' | 'blocked' | 'extension';
  state: 'pending' | 'sent' | 'cancelled';
  cycle: number;
  leaseUntil?: Date;
  leaseId?: string;
  createdAt: Date;
};

@Injectable()
export class BudgetAlertService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BudgetAlertService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly wallets: BudgetWalletRepository,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private get collection() {
    if (!this.connection.db)
      throw new Error('Budget alert storage unavailable');
    return this.connection.db.collection<Alert>('ai_budget_alert_outbox');
  }

  async enqueue(kind: 'low' | 'blocked', cycle: number) {
    const id = `${kind}-${cycle}`;
    await this.collection.updateOne(
      { _id: id },
      {
        $setOnInsert: { kind, cycle, state: 'pending', createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  async blocked(cycle: number) {
    await this.enqueue('blocked', cycle);
  }

  async extension(day: string) {
    await this.collection.updateOne(
      { _id: `extension-${day}` },
      { $setOnInsert: { kind: 'extension', cycle: 0, state: 'pending', createdAt: new Date() } },
      { upsert: true },
    ).catch((error: unknown) => {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    });
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const wallet = await this.wallets.transition((state) => state);
      if (!wallet) return;
      if (wallet.balance <= 2_000_000)
        await this.enqueue('low', wallet.alertCycle ?? 0);
      const user = this.config.get<string>('GMAIL_USER');
      const password = this.config.get<string>('GMAIL_APP_PASSWORD');
      const recipient = this.config.get<string>('BUDGET_ALERT_RECIPIENT');
      if (!user || !password || !recipient) return;
      const now = new Date();
      const leaseId = randomUUID();
      const alert = await this.collection.findOneAndUpdate(
        {
          state: 'pending',
          $or: [
            { leaseUntil: { $exists: false } },
            { leaseUntil: { $lte: now } },
          ],
        },
        { $set: { leaseId, leaseUntil: new Date(now.getTime() + 120_000) } },
        { returnDocument: 'after', sort: { createdAt: 1 } },
      );
      if (!alert) return;
      const current = await this.wallets.transition((state) => state);
      if (
        !current ||
        (alert.kind !== 'extension' && alert.cycle !== (current.alertCycle ?? 0)) ||
        (alert.kind === 'low' && current.balance > 2_000_000)
      ) {
        await this.collection.updateOne(
          { _id: alert._id, leaseId, state: 'pending' },
          {
            $set: { state: 'cancelled' },
            $unset: { leaseId: '', leaseUntil: '' },
          },
        );
        return;
      }
      try {
        await nodemailer
          .createTransport({
            service: 'gmail',
            auth: { user, pass: password },
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
          })
          .sendMail({
            from: user,
            to: recipient,
            subject:
              alert.kind === 'extension'
                ? '[위로] 대화 이용 한도 연장 요청'
                : alert.kind === 'low'
                ? '[위로] AI 예산 잔액 알림'
                : '[위로] AI 예산 부족 알림',
            text:
              alert.kind === 'extension'
                ? '오늘 대화 이용 한도에 도달한 사용자가 있습니다. 운영 상황과 이용 한도를 확인해 주세요.'
                : alert.kind === 'low'
                ? '사용 가능한 AI 예산이 2,000원 이하입니다. 관리자 화면에서 잔액을 확인해 주세요.'
                : 'AI 예산이 부족해 요청을 처리하지 못했습니다. 관리자 화면에서 잔액을 확인해 주세요.',
          });
        await this.collection.updateOne(
          { _id: alert._id, leaseId, state: 'pending' },
          { $set: { state: 'sent' }, $unset: { leaseId: '', leaseUntil: '' } },
        );
      } catch {
        this.logger.warn('예산 알림을 발송하지 못했습니다. 다시 시도합니다.');
      }
    } catch {
      this.logger.warn('예산 상태 또는 알림 대기열을 확인하지 못했습니다.');
    } finally {
      this.running = false;
    }
  }
}
