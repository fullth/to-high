import { Injectable } from '@nestjs/common';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { ChatFailure } from '../../common/chat-failure';
import type { StartOptionsContext } from '../../types/start-options';

const contexts: Record<'general' | 'ticketing', StartOptionsContext> = {
  general: {
    topic:
      '아직 고민을 말하지 않은 방문자. 특정 관심사나 감정을 추정하지 않음.',
    greeting:
      '어디서부터 말해야 할지 몰라도 괜찮아요. 선택지만 눌러도 괜찮아요.',
  },
  ticketing: {
    topic:
      '티켓팅 관련 광고 또는 사이트에서 방문. 실제 티켓팅 결과와 감정은 알 수 없음.',
    advertisement:
      '0.1초 차이로 놓친 자리, 속상하셨죠? AI 상담사 레비가 이야기를 들어드려요.',
    greeting: '티켓팅을 놓쳐서 속상하셨나요? 아쉬운 마음, 제가 들어드릴게요.',
  },
};
@Injectable()
export class StartOptionsService {
  constructor(private readonly agent: OpenAIAgent) {}
  async generate(
    context: 'general' | 'ticketing',
    previous: string[],
    signal: AbortSignal,
  ) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timer = setTimeout(abort, 8000);
    try {
      if (!this.agent.isConfigured() || controller.signal.aborted)
        throw new Error('unavailable');
      return {
        options: await this.agent.generateStartOptions(
          contexts[context],
          previous,
          controller.signal,
        ),
      };
    } catch {
      throw new ChatFailure(
        signal.aborted
          ? 'INTERRUPTED'
          : controller.signal.aborted
            ? 'TIMEOUT'
            : 'UNAVAILABLE',
      );
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
}
