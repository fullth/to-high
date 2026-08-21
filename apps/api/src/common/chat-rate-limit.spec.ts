import { JwtService } from '@nestjs/jwt';
import { createRateLimitTracker } from './chat-rate-limit';

describe('createRateLimitTracker', () => {
  const secret = 'rate-limit-test-secret';
  const tracker = createRateLimitTracker(secret);

  it('검증된 JWT는 IP가 바뀌어도 같은 사용자 키를 사용한다', async () => {
    const token = new JwtService({ secret }).sign({ sub: 'user-1' });

    await expect(
      Promise.all([
        tracker({
          headers: { authorization: `Bearer ${token}` },
          ip: '1.1.1.1',
        }),
        tracker({
          headers: { authorization: `Bearer ${token}` },
          ip: '2.2.2.2',
        }),
      ]),
    ).resolves.toEqual(
      expect.arrayContaining([expect.any(String), expect.any(String)]),
    );

    const first = await tracker({
      headers: { authorization: `Bearer ${token}` },
      ip: '1.1.1.1',
    });
    const second = await tracker({
      headers: { authorization: `Bearer ${token}` },
      ip: '2.2.2.2',
    });
    expect(first).toBe(second);
    expect(first).not.toContain('user-1');
  });

  it('위조 토큰은 사용자 키가 아니라 네트워크 주소 키를 사용한다', async () => {
    const forged = new JwtService({ secret: 'wrong-secret' }).sign({
      sub: 'user-1',
    });

    const forgedTracker = await tracker({
      headers: { authorization: `Bearer ${forged}` },
      ip: '1.1.1.1',
    });
    const anonymousTracker = await tracker({ ip: '1.1.1.1' });
    expect(forgedTracker).toBe(anonymousTracker);
  });

  it('익명 사용자는 복원된 요청 IP별로 서로 다른 키를 사용한다', async () => {
    const first = await tracker({ ip: '1.1.1.1' });
    const second = await tracker({ ip: '2.2.2.2' });

    expect(first).not.toBe(second);
  });
});
