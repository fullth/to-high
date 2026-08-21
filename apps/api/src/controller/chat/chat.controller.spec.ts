import {
  THROTTLER_KEY_GENERATOR,
  THROTTLER_LIMIT,
} from '@nestjs/throttler/dist/throttler.constants';
import { CHAT_LIMITS } from '../../common/chat-limits';
import { ChatController } from './chat.controller';

describe('ChatController rate limits', () => {
  const metadata = <T>(key: string, method: keyof ChatController): T =>
    Reflect.getMetadata(key, ChatController.prototype[method]) as unknown as T;

  it('세션 시작 요청에 별도 분당 상한을 적용한다', () => {
    expect(metadata(`${THROTTLER_LIMIT}default`, 'startSession')).toBe(
      CHAT_LIMITS.sessionStartsPerMinute,
    );
  });

  it('모든 고비용 라우트가 같은 사용자별 생성 예산을 공유한다', () => {
    const methods: (keyof ChatController)[] = [
      'summarizeText',
      'selectOptionStream',
      'endSession',
      'setModeStream',
      'sendMessageStream',
      'resumeSession',
    ];
    const keys = methods.map((method) => {
      expect(metadata(`${THROTTLER_LIMIT}default`, method)).toBe(
        CHAT_LIMITS.generationRequestsPerMinute,
      );
      const keyGenerator = metadata<
        (context: unknown, tracker: string) => string
      >(`${THROTTLER_KEY_GENERATOR}default`, method);
      return keyGenerator({}, 'same-user');
    });

    expect(new Set(keys)).toEqual(new Set(['chat-generation:same-user']));
  });
});
