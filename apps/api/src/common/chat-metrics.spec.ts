import { filterChatMetric } from './chat-metrics';

describe('chat metric privacy boundary', () => {
  it('counts option fallback reasons without forwarding any conversation data', () => {
    expect(
      filterChatMetric({
        name: 'levi.chat.options',
        type: 'counter',
        value: 1,
        attributes: {
          option_result: 'provider_error',
          messages: 'private',
          error: 'private',
        },
      }),
    ).toEqual({
      name: 'levi.chat.options',
      type: 'counter',
      value: 1,
      attributes: { option_result: 'provider_error' },
    });
  });
  it('strips inherited request, identity, text, URLs and unknown attributes', () => {
    const metric = filterChatMetric({
      name: 'levi.ai.tokens',
      type: 'counter',
      value: 40,
      attributes: {
        operation: 'summary',
        token_type: 'input',
        user_id: 'owner',
        messages: 'private-counseling-marker',
        summary: 'private-summary',
        url: 'https://example.com/?private',
        email: 'person@example.com',
        outcome: 'private-error',
      },
    });
    expect(metric).toEqual({
      name: 'levi.ai.tokens',
      type: 'counter',
      value: 40,
      attributes: { operation: 'summary', token_type: 'input' },
    });
  });
  it('rejects arbitrary metric names and invalid numeric values', () => {
    expect(
      filterChatMetric({
        name: 'private-counseling-marker',
        type: 'counter',
        value: 1,
      }),
    ).toBeNull();
    expect(
      filterChatMetric({
        name: 'levi.chat.duration',
        type: 'distribution',
        value: NaN,
      }),
    ).toBeNull();
    expect(
      filterChatMetric({
        name: 'levi.chat.requests',
        type: 'counter',
        value: -1,
      }),
    ).toBeNull();
  });
});
