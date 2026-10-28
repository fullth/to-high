import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategy/jwt.strategy';

describe('database-backed login sessions', () => {
  const userId = new Types.ObjectId();
  const sessionId = new Types.ObjectId();
  const sessionRepository = {
    create: jest.fn(),
    findActive: jest.fn(),
    revoke: jest.fn(),
  };
  const userRepository = {};
  const notificationService = {};
  const jwtService = new JwtService({
    secret: 'auth-session-test-secret',
    signOptions: { expiresIn: '7d' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionRepository.create.mockResolvedValue({
      _id: sessionId,
    });
  });

  it('stores a provider session and embeds its id in the JWT', async () => {
    const service = new AuthService(
      userRepository as never,
      jwtService,
      notificationService as never,
      sessionRepository,
    );
    const user = { _id: userId, email: 'session@example.test' };

    const token = await service.generateToken(user as never, 'google');
    const payload = jwtService.verify<{ sid: string; sub: string }>(token, {
      secret: 'auth-session-test-secret',
    });

    expect(sessionRepository.create).toHaveBeenCalledWith(
      userId.toString(),
      'google',
      expect.any(Date),
    );
    expect(payload.sid).toBe(sessionId.toString());
    expect(payload.sub).toBe(userId.toString());
  });

  it('accepts only an active database session for a session-bound JWT', async () => {
    const strategy = new JwtStrategy(
      { get: () => 'auth-session-test-secret' } as ConfigService,
      sessionRepository,
    );
    const payload = {
      sub: userId.toString(),
      email: 'session@example.test',
      sid: sessionId.toString(),
    };

    sessionRepository.findActive.mockResolvedValueOnce({ _id: sessionId });
    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: userId.toString(),
      email: payload.email,
      sessionId: sessionId.toString(),
    });

    sessionRepository.findActive.mockResolvedValueOnce(null);
    await expect(strategy.validate(payload)).resolves.toBe(false);
  });
});
