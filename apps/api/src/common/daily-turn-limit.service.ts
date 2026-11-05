import { HttpStatus, Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { createHmac } from 'node:crypto';
import { Connection } from 'mongoose';
import { ChatFailure } from './chat-failure';
import { BudgetAlertService } from './budget-alert.service';

@Injectable()
export class DailyTurnLimitService implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
    private readonly alerts: BudgetAlertService,
  ) {}

  async onModuleInit() {
    if (!this.connection.db) throw new ServiceUnavailableException();
    await this.connection.db.collection('daily_turn_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }

  async consume(userId: string | undefined, ip: string, browser: unknown, now = new Date()) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || !this.connection.db || !ip || ip === 'unknown')
      throw new ServiceUnavailableException();
    if (!userId && (typeof browser !== 'string' || !/^[a-f0-9]{32}$/.test(browser)))
      throw new ChatFailure('INVALID_INPUT', HttpStatus.BAD_REQUEST);
    const day = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const key = (type: string, value: string) =>
      `counts.${createHmac('sha256', secret).update(`${day}:${type}:${value}`).digest('hex')}`;
    const keys = userId ? [key('user', userId)] : [key('ip', ip)];
    const limit = userId ? 20 : 5;
    const conditions = keys.map((field) => ({ $or: [{ [field]: { $exists: false } }, { [field]: { $lt: limit } }] }));
    const collection = this.connection.db.collection('daily_turn_limits');
    try {
      await collection.updateOne({ _id: day as never }, { $setOnInsert: { expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) } }, { upsert: true, writeConcern: { w: 'majority' } });
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    }
    const browserCollection = this.connection.db.collection('guest_browser_limits');
    const browserKey = userId ? null : createHmac('sha256', secret).update(`browser:${browser as string}`).digest('hex');
    const result = await collection.updateOne(
      { _id: day as never, $and: conditions },
      { $inc: Object.fromEntries(keys.map((field) => [field, 1])) },
      { writeConcern: { w: 'majority' } },
    );
    if (!result.matchedCount) {
      if (userId) await this.alerts.extension(day);
      throw new ChatFailure(userId ? 'DAILY_USER_LIMIT' : 'DAILY_GUEST_LIMIT', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (browserKey) {
      try {
        await browserCollection.updateOne({ _id: browserKey as never }, { $setOnInsert: { count: 0 } }, { upsert: true, writeConcern: { w: 'majority' } });
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
      }
      const browserResult = await browserCollection.updateOne({ _id: browserKey as never, count: { $lt: 5 } }, { $inc: { count: 1 } }, { writeConcern: { w: 'majority' } });
      if (!browserResult.matchedCount) {
        await collection.updateOne({ _id: day as never }, { $inc: { [keys[0]]: -1 } }, { writeConcern: { w: 'majority' } });
        throw new ChatFailure('DAILY_GUEST_LIMIT', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }
}
