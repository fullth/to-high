import { HttpException } from '@nestjs/common';
import { ChatRequestLimitService } from './chat-request-limit.service';

describe('ChatRequestLimitService', () => {
  it('같은 세션의 동시 요청은 거부하고 종료 후 다시 허용한다', () => {
    const service = new ChatRequestLimitService();
    const release = service.acquire('session-1');

    expect(() => service.acquire('session-1')).toThrow(HttpException);
    expect(() => service.acquire('session-2')).not.toThrow();

    release();
    expect(() => service.acquire('session-1')).not.toThrow();
  });
});
