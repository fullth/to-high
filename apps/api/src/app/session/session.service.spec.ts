import { SessionService } from './session.service';
import { SessionRepository } from '../../persistence/session/session.repository';
import { OpenAIAgent } from '../../client/openai/openai.agent';

describe('SessionService complete counseling context', () => {
  it('종료 요약에 이전 요약과 최근 이력을 모두 전달한다', async () => {
    const session = {
      context: ['나: 오늘은 나아졌어요'],
      rollingSummary: '지난주 직장 갈등으로 불안했어요',
    };
    const repository = {
      findById: jest.fn().mockResolvedValue(session),
      complete: jest.fn().mockResolvedValue({ summary: '상담 요약' }),
    };
    const agent = {
      summarizeSession: jest.fn().mockResolvedValue('상담 요약'),
    };
    const service = new SessionService(
      repository as unknown as SessionRepository,
      agent as unknown as OpenAIAgent,
    );
    await service.complete('session');
    expect(agent.summarizeSession).toHaveBeenCalledWith([
      '[이전 대화 요약] 지난주 직장 갈등으로 불안했어요',
      '나: 오늘은 나아졌어요',
    ]);
    expect(repository.complete).toHaveBeenCalledWith('session', '상담 요약');
  });
});
