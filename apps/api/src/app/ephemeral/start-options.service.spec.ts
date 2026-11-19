import { StartOptionsService } from './start-options.service';
import type { OpenAIAgent } from '../../client/openai/openai.agent';
describe('initial option generation', () => {
  const options = [
    '선택지 하나예요',
    '선택지 둘이에요',
    '선택지 셋이에요',
    '선택지 넷이에요',
  ];
  function setup(generate = jest.fn().mockResolvedValue(options)) {
    const agent = {
      isConfigured: jest.fn(() => true),
      generateStartOptions: generate,
    };
    return {
      service: new StartOptionsService(agent as unknown as OpenAIAgent),
      agent,
    };
  }
  it('selects server-owned advertisement context and calls the model once', async () => {
    const { service, agent } = setup();
    await expect(
      service.generate(
        'ticketing',
        ['이전 선택지예요'],
        new AbortController().signal,
      ),
    ).resolves.toEqual({ options });
    expect(agent.generateStartOptions).toHaveBeenCalledTimes(1);
    expect(agent.generateStartOptions.mock.calls[0][0]).toMatchObject({
      advertisement: expect.stringContaining('0.1초'),
      greeting: expect.stringContaining('속상하셨나요'),
    });
  });
  it('does not dispatch when the caller already cancelled', async () => {
    const { service, agent } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(
      service.generate('general', [], controller.signal),
    ).rejects.toMatchObject({ code: 'INTERRUPTED' });
    expect(agent.generateStartOptions).not.toHaveBeenCalled();
  });
  it('ends a slow generation and does not retry', async () => {
    jest.useFakeTimers();
    try {
      const generate = jest.fn(
        (_context: unknown, _previous: unknown, signal: AbortSignal) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener(
              'abort',
              () => reject(new Error('cancelled')),
              { once: true },
            ),
          ),
      );
      const { service } = setup(generate);
      const pending = expect(
        service.generate('general', [], new AbortController().signal),
      ).rejects.toMatchObject({ code: 'TIMEOUT' });
      await jest.advanceTimersByTimeAsync(8001);
      await pending;
      expect(generate).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
  it('does not return provider error details', async () => {
    const { service } = setup(
      jest.fn().mockRejectedValue(new Error('private-provider-details')),
    );
    await expect(
      service.generate('general', [], new AbortController().signal),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
});
