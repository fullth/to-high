import { ConfigService } from '@nestjs/config';
import { DailyUsageRepository } from '../../persistence/usage/daily-usage.repository';
import { DailyUsageService } from './daily-usage.service';

describe('privacy bounded usage aggregation', () => {
  const record = jest.fn().mockResolvedValue(undefined);
  const repository = {
    record,
    recent: jest.fn(),
    firstRecordedAt: jest.fn(),
    removeExpiredIdentities: jest.fn().mockResolvedValue(undefined),
  };
  const service = new DailyUsageService(
    repository as unknown as DailyUsageRepository,
    { get: () => 'synthetic-test-key' } as unknown as ConfigService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('sends only daily rotated HMAC identities for successful requests', async () => {
    await service.record({
      outcome: 'ok',
      firstTurn: true,
      userId: 'synthetic-account',
      ip: '192.0.2.1',
      startedAt: new Date('2026-11-15T14:00:00Z'),
    });
    const before = record.mock.calls[0];
    await service.record({
      outcome: 'ok',
      userId: 'synthetic-account',
      startedAt: new Date('2026-11-15T15:00:00Z'),
    });
    expect(before[2]).toEqual({
      kind: 'user',
      hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(before[2].hash).not.toBe(record.mock.calls[1][2].hash);
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'synthetic-account',
    );
    expect(JSON.stringify(record.mock.calls)).not.toContain('192.0.2.1');
  });
  it('does not identify rejected or failed requests and tolerates storage failure', async () => {
    await service.record({ outcome: 'TIMEOUT', ip: '192.0.2.1' });
    expect(record.mock.calls[0][2]).toBeUndefined();
    record.mockRejectedValueOnce(new Error('private-provider-error'));
    const warning = jest.spyOn(service['logger'], 'warn').mockImplementation();
    await expect(service.record({ outcome: 'ok' })).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith('Usage aggregation unavailable');
    warning.mockRestore();
  });
  it('keeps first collection time independent of the rolling query window', async () => {
    repository.firstRecordedAt.mockResolvedValue({
      firstRecordedAt: new Date('2026-10-01T00:00:00Z'),
    });
    repository.recent.mockResolvedValue([
      { _id: '2026-11-15', requests: 1, successes: 1 },
    ]);
    const report = await service.recent(new Date('2026-11-16T00:00:00Z'));
    expect(report).toMatchObject({
      from: '2026-10-18',
      to: '2026-11-16',
      firstRecordedAt: '2026-10-01T00:00:00.000Z',
    });
    expect(report.days[0]).not.toHaveProperty('identities');
  });
});
