import { ConfigService } from '@nestjs/config';
import * as metrics from '../../common/chat-metrics';
import { OpenAIAgent } from './openai.agent';

const modelBudgetMock = {
  reserve: async () => ({ id: 'test' }),
  settle: async () => {},
};

describe('model usage accounting', () => {
  const usage = {
    prompt_tokens: 200,
    completion_tokens: 20,
    prompt_tokens_details: { cached_tokens: 128 },
  };
  let agent: OpenAIAgent;
  let create: jest.Mock;
  let record: jest.SpyInstance;

  beforeEach(() => {
    agent = new OpenAIAgent(
      {
        get: () => 'test-key',
      } as unknown as ConfigService,
      modelBudgetMock as never,
    );
    create = jest.fn();
    (agent as any).openai.chat.completions.create = create;
    record = jest
      .spyOn(metrics, 'recordModelUsage')
      .mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('records model and cache usage for a completed response', async () => {
    create.mockResolvedValue({
      usage,
      choices: [{ message: { content: '괜찮아요' } }],
    });
    await agent.generateResponse([], 'comfort');
    expect(record).toHaveBeenCalledWith(
      'reply',
      'gpt-6.1-terra',
      'missing',
      usage,
    );
  });

  it('requests stream usage and records an incomplete stream as cancelled', async () => {
    create.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: '안녕' } }] };
      })(),
    );
    const stream = agent.generateResponseStream([], 'comfort');
    await stream.next();
    await stream.return();
    expect(create.mock.calls[0][0].stream_options.include_usage).toBe(true);
    expect(record).toHaveBeenCalledWith(
      'reply',
      'gpt-6.1-terra',
      'cancelled',
      undefined,
    );
  });

  it('records a provider failure without forwarding the error', async () => {
    create.mockRejectedValue(new Error('private text'));
    await expect(agent.generateResponse([], 'comfort')).rejects.toThrow();
    expect(record).toHaveBeenCalledWith('reply', 'gpt-6.1-terra', 'failed');
    expect(JSON.stringify(record.mock.calls)).not.toContain('private text');
  });
});
