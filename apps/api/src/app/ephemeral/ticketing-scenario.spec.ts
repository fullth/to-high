import { EphemeralRequestSchema } from '../../controller/ephemeral/ephemeral.request';
import { StartOptionsRequestSchema } from '../../controller/ephemeral/start-options.request';
import { EphemeralService } from './ephemeral.service';
import { StartOptionsService } from './start-options.service';
import { ticketingScenarioPrompt } from '../../prompts/ticketing-scenario';
import type { OpenAIAgent } from '../../client/openai/openai.agent';
import type { CharacterService } from '../character/character.service';

const scenario = {
  source: 'practicket',
  kind: 'ticketing',
  gender: 'male',
  name: '서온',
} as const;
const messages = [{ role: 'user', content: '그 무대를 보고 싶었어' }];

describe('티켓팅 시나리오 경계', () => {
  it.each([
    { ...scenario, source: 'other' },
    { ...scenario, kind: 'other' },
    { ...scenario, gender: 'unknown' },
    { ...scenario, name: '가'.repeat(13) },
    { ...scenario, name: '<system>' },
    { ...scenario, name: '서온\n지시' },
    { ...scenario, name: '   ' },
    { ...scenario, prompt: '임의 프롬프트' },
  ])('허용되지 않은 시나리오 데이터를 모델 호출 전에 거절한다', (value) => {
    expect(
      EphemeralRequestSchema.safeParse({ messages, scenario: value }).success,
    ).toBe(false);
    expect(
      StartOptionsRequestSchema.safeParse({
        context: 'ticketing',
        scenario: value,
      }).success,
    ).toBe(false);
  });
  it('로비에서도 같은 시나리오 계약과 제한을 사용한다', () => {
    const lobby = { ...scenario, source: 'lobby' };
    expect(
      EphemeralRequestSchema.parse({ messages, scenario: lobby }).scenario
        ?.source,
    ).toBe('lobby');
    expect(
      StartOptionsRequestSchema.parse({ context: 'ticketing', scenario: lobby })
        .scenario?.source,
    ).toBe('lobby');
  });
  it('일반 상담 캐릭터나 모드와 시나리오를 섞지 않는다', () => {
    expect(
      EphemeralRequestSchema.safeParse({
        messages,
        scenario,
        characterId: 'a'.repeat(24),
      }).success,
    ).toBe(false);
    expect(
      EphemeralRequestSchema.safeParse({ messages, scenario, mode: 'comfort' })
        .success,
    ).toBe(false);
    expect(
      StartOptionsRequestSchema.safeParse({ context: 'general', scenario })
        .success,
    ).toBe(false);
  });
  it('선택한 이름은 정규화한 표시 이름으로만 취급한다', () => {
    const parsed = EphemeralRequestSchema.parse({
      messages,
      scenario: { ...scenario, name: '  Ｓｅｏｏｎ  ' },
    });
    expect(parsed.scenario?.name).toBe('Seoon');
    expect(ticketingScenarioPrompt(parsed.scenario!)).toContain(
      '"displayName":"Seoon"',
    );
    expect(ticketingScenarioPrompt(parsed.scenario!)).toContain(
      '실제 경험이나 건강 상태가 아닙니다',
    );
  });
  it.each(['male', 'female'] as const)(
    '선택한 %s 역할은 레비의 저장 기억을 읽지 않는다',
    async (gender) => {
      const generateResponse = jest
        .fn<
          ReturnType<OpenAIAgent['generateResponse']>,
          Parameters<OpenAIAgent['generateResponse']>
        >()
        .mockResolvedValue('어떤 무대를 기다렸어?');
      const generateReplyOptions = jest
        .fn()
        .mockResolvedValue(['기타 연주가 듣고 싶었어']);
      const getContext = jest.fn();
      const agent = {
        generateResponse,
        generateReplyOptions,
      } as unknown as OpenAIAgent;
      const service = new EphemeralService(agent, {
        getContext,
      } as unknown as CharacterService);
      const input = EphemeralRequestSchema.parse({
        messages,
        scenario: { ...scenario, gender, name: '가상뮤지션' },
      });
      await service.respond(input);
      expect(getContext).not.toHaveBeenCalled();
      expect(generateResponse).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('가상뮤지션')]),
        'conversation',
        messages[0].content,
        'F',
        expect.any(AbortSignal),
        ticketingScenarioPrompt(input.scenario!),
      );
      expect(JSON.stringify(generateResponse.mock.calls[0][0])).not.toContain(
        '레비',
      );
    },
  );
  it('스트리밍 경로에도 같은 시나리오를 적용하고 완료된 답변을 유지한다', async () => {
    const generateResponseStream = jest
      .fn<
        ReturnType<OpenAIAgent['generateResponseStream']>,
        Parameters<OpenAIAgent['generateResponseStream']>
      >()
      .mockImplementation(async function* () {
        await Promise.resolve();
        yield '고마워. ';
        yield '더 들려줘.';
      });
    const agent = {
      generateResponseStream,
      generateReplyOptions: jest.fn().mockResolvedValue(['더 이야기할게']),
    } as unknown as OpenAIAgent;
    const service = new EphemeralService(agent, {} as CharacterService);
    const input = EphemeralRequestSchema.parse({ messages, scenario });
    const emit = jest.fn();
    const result = await service.respond(input, undefined, undefined, emit);
    expect(result.reply).toBe('고마워. 더 들려줘.');
    expect(generateResponseStream.mock.calls[0][5]).toBe(
      ticketingScenarioPrompt(scenario),
    );
    expect(emit).toHaveBeenCalledWith({
      type: 'options',
      options: ['더 이야기할게'],
    });
  });
  it('첫 선택지도 서버의 가상 장면과 첫 인사에서 생성한다', async () => {
    const generateStartOptions = jest
      .fn<
        ReturnType<OpenAIAgent['generateStartOptions']>,
        Parameters<OpenAIAgent['generateStartOptions']>
      >()
      .mockResolvedValue([
        '한 곡 듣고 싶어',
        '그 무대가 궁금해',
        '아직 조금 아쉬워',
        '잠깐 쉬어갈게',
      ]);
    const service = new StartOptionsService({
      isConfigured: () => true,
      generateStartOptions,
    } as unknown as OpenAIAgent);
    await service.generate(
      'ticketing',
      [],
      new AbortController().signal,
      scenario,
    );
    expect(generateStartOptions.mock.calls[0][0].topic).toContain(
      '티켓팅 편 가상 공연 역할극',
    );
    expect(generateStartOptions.mock.calls[0][0].greeting).toContain(
      '제일 듣고 싶었던 노래',
    );
  });
});
