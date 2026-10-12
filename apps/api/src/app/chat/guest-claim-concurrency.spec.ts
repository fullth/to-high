import { HttpException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestLimitService } from '../../common/chat-request-limit.service';
it('claim shares the request lock and a second claim cannot run concurrently', async () => {
  let finish: (value: unknown) => void = () => {};
  const repository = {
    findById: jest.fn().mockResolvedValue({
      isGuest: true,
      userId: { toString: () => 'guest' },
    }),
    claimGuestSession: jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
  };
  const locks = new ChatRequestLimitService();
  const service = new ChatService(
    {} as never,
    repository as never,
    {} as never,
    {} as never,
    {} as never,
    locks,
  );
  const release = locks.acquire('session');
  await expect(
    service.claimGuestSession('session', 'owner'),
  ).rejects.toBeInstanceOf(HttpException);
  expect(repository.claimGuestSession).not.toHaveBeenCalled();
  release();
  const first = service.claimGuestSession('session', 'owner');
  await Promise.resolve();
  await Promise.resolve();
  await expect(
    service.claimGuestSession('session', 'other'),
  ).rejects.toBeInstanceOf(HttpException);
  finish({ userId: 'owner' });
  await expect(first).resolves.toEqual({ claimed: true });
  expect(repository.claimGuestSession).toHaveBeenCalledTimes(1);
  const unlocked = locks.acquire('session');
  unlocked();
});
