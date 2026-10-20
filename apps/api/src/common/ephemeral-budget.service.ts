import { createHash } from 'node:crypto';
import { ChatFailure } from './chat-failure';
import {
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

/** Body-free RAM counters. Not a distributed or dollar-denominated budget. */
@Injectable()
export class EphemeralBudgetService {
  private readonly active = new Set<string>();
  private day = '';
  private requests = 0;

  acquireOwner(userId: string | undefined, address: string): () => void {
    const configured = process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT;
    const limit =
      configured === undefined
        ? process.env.NODE_ENV === 'production'
          ? 0
          : 100
        : Number(configured);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100_000) {
      throw new ServiceUnavailableException(
        '상담 사용량 제한 설정이 필요합니다.',
      );
    }
    const key = createHash('sha256')
      .update(
        userId && userId !== 'anonymous' ? `user:${userId}` : `ip:${address}`,
      )
      .digest('hex');
    if (this.active.has(key)) {
      throw new ChatFailure('BUSY', HttpStatus.TOO_MANY_REQUESTS);
    }
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.requests = 0;
    }
    if (this.requests >= limit) {
      throw new ChatFailure('RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }
    // Reserve before provider calls; failed/aborted requests still consume quota.
    this.requests += 1;
    this.active.add(key);
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active.delete(key);
      }
    };
  }
}
