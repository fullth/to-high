import { createHash } from 'node:crypto';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { GuestSessionGuard } from './guest-session.guard';
import { SessionRepository } from '../persistence/session/session.repository';

const token = 'a'.repeat(64);
const otherToken = 'b'.repeat(64);
const id = '507f1f77bcf86cd799439011';
const hash = createHash('sha256').update(token).digest('hex');
describe('GuestSessionGuard ownership', () => {
  let findForAccess: jest.Mock;
  let guard: GuestSessionGuard;
  beforeEach(() => {
    findForAccess = jest.fn().mockResolvedValue({
      isGuest: true,
      guestAccessHash: hash,
      userId: { toString: () => 'owner' },
    });
    guard = new GuestSessionGuard({
      findForAccess,
    } as unknown as SessionRepository);
  });
  const context = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers: {}, ...request }) }),
    }) as ExecutionContext;
  it.each(['select/stream', 'message/stream', 'mode/stream', 'end'])(
    '%s rejects another browser before mutation',
    async (route) => {
      await expect(
        guard.canActivate(
          context({
            body: { sessionId: id },
            route: { path: `/chat/${route}` },
            headers: { 'x-guest-token': otherToken },
          }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        guard.canActivate(
          context({
            body: { sessionId: id },
            headers: { 'x-guest-token': token },
          }),
        ),
      ).resolves.toBe(true);
    },
  );
  it.each(['detail', 'resume', 'claim', 'save', 'delete', 'alias'])(
    '%s requires proof for a guest ID',
    async (route) => {
      await expect(
        guard.canActivate(
          context({
            params: { sessionId: id },
            route: { path: `/chat/sessions/:sessionId/${route}` },
          }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );
  it('an authenticated stranger cannot claim without proof; the guest holder can', async () => {
    const request = {
      params: { sessionId: id },
      user: { userId: 'attacker' },
      route: { path: '/chat/sessions/:sessionId/claim' },
    };
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      guard.canActivate(
        context({ ...request, headers: { 'x-guest-token': token } }),
      ),
    ).resolves.toBe(true);
  });
  it('legacy guest sessions fail closed even with a newly invented proof', async () => {
    findForAccess.mockResolvedValue({
      isGuest: true,
      userId: { toString: () => 'old' },
    });
    await expect(
      guard.canActivate(
        context({
          params: { sessionId: id },
          headers: { 'x-guest-token': token },
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('login session requires its owner and does not accept a guest token', async () => {
    findForAccess.mockResolvedValue({
      isGuest: false,
      userId: { toString: () => 'owner' },
    });
    for (const user of [undefined, { userId: 'other' }]) {
      await expect(
        guard.canActivate(
          context({
            params: { sessionId: id },
            user,
            headers: { 'x-guest-token': token },
          }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    }
    await expect(
      guard.canActivate(
        context({ params: { sessionId: id }, user: { userId: 'owner' } }),
      ),
    ).resolves.toBe(true);
  });
  it('tokens from another session are rejected and tokens with duplicate headers are rejected', async () => {
    for (const proof of [otherToken, [token, otherToken], '', 'short']) {
      await expect(
        guard.canActivate(
          context({
            params: { sessionId: id },
            headers: { 'x-guest-token': proof },
          }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    }
  });
  it('does not query persistence for new sessions or invalid IDs', async () => {
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    await expect(
      guard.canActivate(context({ body: { sessionId: 'invalid' } })),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findForAccess).not.toHaveBeenCalled();
  });
});
