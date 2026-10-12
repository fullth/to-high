import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionRepository } from '../persistence/session/session.repository';

@Injectable()
export class GuestSessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      params?: { sessionId?: string };
      body?: { sessionId?: string };
      headers: Record<string, string | string[] | undefined>;
      user?: { userId: string };
      route?: { path?: string };
    }>();
    const sessionId = req.params?.sessionId ?? req.body?.sessionId;
    if (!sessionId) return true; // start, summarize and lists have no existing session.
    if (typeof sessionId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(sessionId)) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }
    const session = await this.sessions.findForAccess(sessionId);
    if (!session) throw new NotFoundException('이야기를 찾을 수 없어요');
    const isClaim = req.route?.path?.endsWith('/claim') === true;
    if (!session.isGuest) {
      if (req.user && session.userId.toString() === req.user.userId)
        return true;
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }
    // Login never proves ownership of another browser's guest session.
    if (req.user && !isClaim)
      throw new NotFoundException('이야기를 찾을 수 없어요');
    const token = req.headers['x-guest-token'];
    const expected = session.guestAccessHash;
    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token) ||
      typeof expected !== 'string' ||
      !/^[a-f0-9]{64}$/.test(expected)
    ) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }
    const actual = createHash('sha256').update(token).digest();
    if (!timingSafeEqual(actual, Buffer.from(expected, 'hex'))) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }
    return true;
  }
}
