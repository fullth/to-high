import { ChatService } from './chat.service';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { ChatRequestLimitService } from '../../common/chat-request-limit.service';
import { SessionRepository } from '../../persistence/session/session.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { UserProfileRepository } from '../../persistence/user-profile/user-profile.repository';
import { SessionService } from '../session/session.service';

describe('ChatService shared counseling context', () => {
  it('응답 생성 시 이전 요약과 최근 이력을 함께 사용한다', async () => {
    const session = {
      userId: { toString: () => 'owner' },
      isGuest: false,
      context: ['나: 요즘은 괜찮아요'],
      rollingSummary: '오래된 직장 갈등',
      responseMode: 'comfort',
      alias: '상담',
    };
    const sessions = {
      findById: jest.fn().mockResolvedValue(session),
      addContext: jest.fn(),
    };
    const agent = {
      generateResponseStream: jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        yield '응답';
      }),
    };
    const service = new ChatService(
      sessions as unknown as SessionService,
      {} as SessionRepository,
      {} as UserRepository,
      {} as UserProfileRepository,
      agent as unknown as OpenAIAgent,
      new ChatRequestLimitService(),
    );
    for await (const _chunk of service.generateResponseStream(
      'session',
      undefined,
      undefined,
      'owner',
    )) {
      expect(_chunk).toBeDefined();
    }
    expect(agent.generateResponseStream).toHaveBeenCalledWith(
      ['[이전 대화 요약] 오래된 직장 갈등', '나: 요즘은 괜찮아요'],
      'comfort',
      undefined,
      undefined,
    );
  });

  it('일반 선택 뒤 질문에도 이전 요약과 최신 사용자 선택을 함께 전달한다', async () => {
    const session = {
      userId: { toString: () => 'owner' },
      isGuest: false,
      context: ['나: 이전 이야기'],
      rollingSummary: '오래된 직장 갈등',
      category: 'self',
      turnCount: 2,
    };
    const updated = {
      ...session,
      context: [...session.context, '나: 지금은 마음이 편해요'],
    };
    const sessions = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(session)
        .mockResolvedValue(updated),
      addContext: jest.fn(),
    };
    const agent = {
      generateOptionsStream: jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        yield { type: 'question_chunk', content: '마음을 들었어요.' };
        yield {
          type: 'options',
          options: ['정리해주세요'],
          canProceedToResponse: true,
        };
      }),
    };
    const service = new ChatService(
      sessions as unknown as SessionService,
      {} as SessionRepository,
      {} as UserRepository,
      {} as UserProfileRepository,
      agent as unknown as OpenAIAgent,
      new ChatRequestLimitService(),
    );
    for await (const _chunk of service.selectOptionStream(
      'session',
      '지금은 마음이 편해요',
      undefined,
      'owner',
    )) {
      expect(_chunk).toBeDefined();
    }
    expect(agent.generateOptionsStream).toHaveBeenCalledWith(
      [
        '[이전 대화 요약] 오래된 직장 갈등',
        '나: 이전 이야기',
        '나: 지금은 마음이 편해요',
      ],
      'collecting',
      'self',
      undefined,
    );
    expect(sessions.addContext).toHaveBeenCalledWith(
      'session',
      '상담사: 마음을 들었어요.',
    );
  });
});
