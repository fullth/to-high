import { createHash } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { CHAT_LIMITS } from './chat-limits';

type HttpRequest = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

function opaqueTracker(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createRateLimitTracker(jwtSecret?: string) {
  const jwtService = jwtSecret ? new JwtService({ secret: jwtSecret }) : null;

  return (request: HttpRequest): Promise<string> => {
    const authorization = request.headers?.authorization;
    const bearer = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    const token = bearer?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (token && jwtService) {
      try {
        const payload = jwtService.verify<{ sub?: unknown }>(token);
        if (typeof payload.sub === 'string' && payload.sub.length > 0) {
          return Promise.resolve(opaqueTracker(`user:${payload.sub}`));
        }
      } catch {
        // 유효하지 않은 토큰은 인증 사용자 키로 인정하지 않고 네트워크 주소로 제한한다.
      }
    }

    const address = request.ip || request.socket?.remoteAddress || 'unknown';
    return Promise.resolve(opaqueTracker(`network:${address}`));
  };
}

const sharedGenerationKey = (_context: ExecutionContext, tracker: string) =>
  `chat-generation:${tracker}`;

export const LimitChatGeneration = () =>
  Throttle({
    default: {
      limit: CHAT_LIMITS.generationRequestsPerMinute,
      ttl: 60_000,
      generateKey: sharedGenerationKey,
    },
  });

export const LimitSessionStart = () =>
  Throttle({
    default: {
      limit: CHAT_LIMITS.sessionStartsPerMinute,
      ttl: 60_000,
    },
  });
