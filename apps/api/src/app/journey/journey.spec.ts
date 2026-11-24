import { ConfigService } from '@nestjs/config';
import { JourneyService } from './journey.service';
import { JourneyContextSchema, JourneyEventSchema } from './journey';
import { EphemeralRequestSchema } from '../../controller/ephemeral/ephemeral.request';

const context = {
  id: 'a'.repeat(32),
  source: 'practicket',
  entry: 'lobby_ticketing',
} as const;
describe('anonymous journey contract', () => {
  it('keeps acquisition separate from scenario selection location', () => {
    expect(
      EphemeralRequestSchema.safeParse({
        messages: [{ role: 'user', content: '합성 입력' }],
        scenario: {
          source: 'lobby',
          kind: 'ticketing',
          gender: 'male',
          name: '가상인물',
        },
        journey: { ...context, turnId: 'b'.repeat(32) },
      }).success,
    ).toBe(true);
    expect(
      EphemeralRequestSchema.safeParse({
        messages: [{ role: 'user', content: '합성 입력' }],
        journey: { ...context, turnId: 'b'.repeat(32) },
      }).success,
    ).toBe(false);
  });
  it('rejects content, identity and browser-claimed server success', () => {
    for (const extra of [
      { name: '개인 이름' },
      { messages: ['원문'] },
      { url: 'private' },
      { userId: 'private' },
    ])
      expect(
        JourneyContextSchema.safeParse({ ...context, ...extra }).success,
      ).toBe(false);
    expect(
      JourneyEventSchema.safeParse({
        journey: context,
        event: 'first_response',
      }).success,
    ).toBe(false);
    expect(
      JourneyEventSchema.safeParse({
        journey: { ...context, entry: 'unselected' },
        event: 'selected',
      }).success,
    ).toBe(false);
  });
  it('passes only hashed anonymous identifiers and fixed enums to storage', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new JourneyService(
      { record } as never,
      new ConfigService({ JWT_SECRET: 'synthetic-test-secret' }),
    );
    await service.record(context, ['first_response'], 'b'.repeat(32));
    expect(record.mock.calls[0]).toEqual([
      expect.stringMatching(/^[a-f0-9]{64}$/),
      { source: 'practicket', entry: 'lobby_ticketing' },
      ['first_response'],
      expect.stringMatching(/^[a-f0-9]{64}$/),
    ]);
    expect(JSON.stringify(record.mock.calls)).not.toContain(context.id);
  });
  it('does not fail counseling on metrics storage errors', async () => {
    const service = new JourneyService(
      {
        record: jest.fn().mockRejectedValue(new Error('private error')),
      } as never,
      new ConfigService({ JWT_SECRET: 'synthetic-test-secret' }),
    );
    await expect(
      service.record(context, ['selected']),
    ).resolves.toBeUndefined();
  });
});
