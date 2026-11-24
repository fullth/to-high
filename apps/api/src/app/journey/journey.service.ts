import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { JourneyRepository } from '../../persistence/journey/journey.repository';
import { koreanDay } from '../usage/daily-usage';
import type { JourneyContext, JourneyStage } from './journey';

@Injectable()
export class JourneyService {
  private readonly logger = new Logger(JourneyService.name);
  constructor(
    private readonly repository: JourneyRepository,
    private readonly config: ConfigService,
  ) {}
  async record(
    context: JourneyContext,
    stages: JourneyStage[],
    turnId?: string,
  ) {
    try {
      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) return;
      const hash = (value: string) =>
        createHmac('sha256', secret).update(`journey:${value}`).digest('hex');
      await this.repository.record(
        hash(context.id),
        { source: context.source, entry: context.entry },
        stages,
        turnId ? hash(turnId) : undefined,
      );
    } catch {
      this.logger.warn('Journey aggregation unavailable');
    }
  }
  async recent(now = new Date()) {
    const to = koreanDay(now);
    const from = koreanDay(new Date(now.valueOf() - 29 * 86400000));
    const [rows, first] = await Promise.all([
      this.repository.recent(
        new Date(`${from}T00:00:00+09:00`),
        new Date(new Date(`${to}T00:00:00+09:00`).valueOf() + 86400000),
      ),
      this.repository.firstRecordedAt(),
    ]);
    return {
      from,
      to,
      firstRecordedAt: first?.startedAt.toISOString() ?? null,
      days: rows.map(({ _id, ...counts }) => ({ ..._id, ...counts })),
    };
  }
}
