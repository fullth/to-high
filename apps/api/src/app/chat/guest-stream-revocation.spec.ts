import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestLimitService } from '../../common/chat-request-limit.service';
it('does not transmit a later LLM chunk or save it after guest ownership is revoked', async () => {
  const guest = {
    isGuest: true,
    userId: { toString: () => 'guest' },
    context: ['카테고리: self', '나: 힘들어요'],
    responseMode: 'comfort',
  };
  let revoked = false;
  const sessions = {
    findById: jest
      .fn()
      .mockImplementation(() => Promise.resolve(revoked ? null : guest)),
    addContext: jest.fn(),
  };
  const agent = {
    generateResponseStream: async function* () {
      await Promise.resolve();
      yield 'authorized';
      revoked = true;
      yield 'must not transmit';
    },
  };
  const service = new ChatService(
    sessions as never,
    {} as never,
    {} as never,
    {} as never,
    agent as never,
    new ChatRequestLimitService(),
  );
  const stream = service.generateResponseStream('session');
  await expect(stream.next()).resolves.toMatchObject({ value: 'authorized' });
  await expect(stream.next()).rejects.toBeInstanceOf(NotFoundException);
  expect(sessions.addContext).not.toHaveBeenCalled();
});
