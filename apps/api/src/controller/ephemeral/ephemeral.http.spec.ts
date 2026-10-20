import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { EphemeralController } from './ephemeral.controller';
import { EphemeralService } from '../../app/ephemeral/ephemeral.service';
import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { CharacterService } from '../../app/character/character.service';
import { PrivacyExceptionFilter } from '../../common/privacy-exception.filter';

// Real Nest/Express HTTP transport, synthetic model responses, no DB or paid calls.
describe('ephemeral HTTP streaming transport', () => {
  let app: INestApplication;
  let origin: string;
  const generateResponseStream = jest.fn();
  const generateResponse = jest.fn();
  const generateReplyOptions = jest.fn();
  const release = jest.fn();
  beforeAll(async () => {
    const service = new EphemeralService(
      {
        isConfigured: () => true,
        generateResponseStream,
        generateResponse,
        generateReplyOptions,
      } as unknown as OpenAIAgent,
      {} as CharacterService,
    );
    const module = await Test.createTestingModule({
      controllers: [EphemeralController],
      providers: [
        { provide: EphemeralService, useValue: service },
        {
          provide: EphemeralBudgetService,
          useValue: { acquireOwner: () => release },
        },
      ],
    })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new PrivacyExceptionFilter());
    await app.init();
    await app.listen(0, '127.0.0.1');
    origin = await app.getUrl();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    generateResponse.mockResolvedValue('합성 완성 답변');
    generateReplyOptions.mockResolvedValue(['계속 이야기할게요']);
    generateResponseStream.mockImplementation(async function* () {
      yield '먼저 도착한 답변';
    });
  });
  afterAll(async () => {
    await app.close();
  });
  function send(streaming = true) {
    return fetch(`${origin}/ephemeral/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: streaming ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '합성 고민' }],
      }),
    });
  }
  async function until(check: () => boolean) {
    for (let i = 0; i < 100 && !check(); i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    expect(check()).toBe(true);
  }
  it('delivers the reply over HTTP while option generation is still pending', async () => {
    let finish!: (options: string[]) => void;
    generateReplyOptions.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const response = await send();
    expect(response.ok).toBe(true);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe(
      'no-store, no-transform',
    );
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let wire = '';
    while (!wire.includes('"type":"reply"')) {
      const chunk = await reader.read();
      expect(chunk.done).toBe(false);
      wire += decoder.decode(chunk.value);
    }
    expect(wire).toContain('먼저 도착한 답변');
    expect(wire).not.toContain('"type":"done"');
    finish(['계속 이야기할게요']);
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      wire += decoder.decode(chunk.value);
    }
    expect(wire).toContain('"type":"options"');
    expect(wire).toContain('"type":"done"');
    await until(() => release.mock.calls.length === 1);
  });
  it('aborts generation and releases when the real HTTP stream is cancelled', async () => {
    let upstreamSignal: AbortSignal | undefined;
    generateResponseStream.mockImplementation(async function* (
      _context,
      _mode,
      _text,
      _style,
      signal: AbortSignal,
    ) {
      upstreamSignal = signal;
      yield '취소 전 일부';
      await new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new Error('cancelled')), {
          once: true,
        }),
      );
    });
    const response = await send();
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain('취소 전 일부');
    await reader.cancel();
    await until(
      () => !!upstreamSignal?.aborted && release.mock.calls.length === 1,
    );
    expect(generateReplyOptions).not.toHaveBeenCalled();
  });
  it('keeps JSON compatibility for existing deployed clients', async () => {
    const response = await send(false);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({
      reply: '합성 완성 답변',
      options: ['계속 이야기할게요'],
    });
    expect(generateResponse).toHaveBeenCalledTimes(1);
    expect(generateResponseStream).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
