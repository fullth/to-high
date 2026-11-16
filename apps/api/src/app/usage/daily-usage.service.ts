import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { DailyUsageRepository } from '../../persistence/usage/daily-usage.repository';
import { koreanDay, requestCounters } from './daily-usage';

@Injectable()
export class DailyUsageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyUsageService.name);
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly repository: DailyUsageRepository,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    void this.cleanup();
    this.timer = setInterval(() => void this.cleanup(), 60 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async cleanup() {
    try {
      await this.repository.removeExpiredIdentities();
    } catch {
      this.logger.warn('Usage identity cleanup unavailable');
    }
  }

  async record(input: {
    outcome: string;
    firstTurn?: boolean;
    rejected?: boolean;
    userId?: string;
    ip?: string;
    startedAt?: Date;
  }) {
    const day = koreanDay(input.startedAt);
    const kind = input.userId ? 'user' : 'ip';
    const value = input.userId || input.ip;
    const secret = this.config.get<string>('JWT_SECRET');
    const identity =
      input.outcome === 'ok' &&
      !input.rejected &&
      value &&
      value !== 'unknown' &&
      secret
        ? ({
            kind,
            hash: createHmac('sha256', secret)
              .update(`usage:${day}:${kind}:${value}`)
              .digest('hex'),
          } as const)
        : undefined;
    try {
      await this.repository.record(
        day,
        requestCounters(
          input.outcome,
          Boolean(input.firstTurn),
          Boolean(input.rejected),
        ),
        identity,
      );
    } catch {
      // Metrics failure must not replace a counseling response or expose request/error data.
      this.logger.warn('Usage aggregation unavailable');
    }
  }

  async recent(now = new Date()) {
    const to = koreanDay(now);
    const from = koreanDay(new Date(now.getTime() - 29 * 86400000));
    const [records, first] = await Promise.all([
      this.repository.recent(from, to),
      this.repository.firstRecordedAt(),
    ]);
    return {
      from,
      to,
      firstRecordedAt: first?.firstRecordedAt.toISOString() ?? null,
      days: records.map((r) => ({
        day: r._id,
        requests: r.requests ?? 0,
        successes: r.successes ?? 0,
        starts: r.starts ?? 0,
        failures: r.failures ?? 0,
        cancelled: r.cancelled ?? 0,
        rejected: r.rejected ?? 0,
        signedInAccounts: r.signedInAccounts ?? 0,
        guestNetworks: r.guestNetworks ?? 0,
        outcomes: r.outcomes ?? {},
      })),
    };
  }
}
