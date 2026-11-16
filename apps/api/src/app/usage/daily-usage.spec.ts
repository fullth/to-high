import { koreanDay, requestCounters } from './daily-usage';

describe('durable request usage definitions', () => {
  it('splits the Korean calendar day at UTC 15:00', () => {
    expect(koreanDay(new Date('2026-11-15T14:59:59Z'))).toBe('2026-11-15');
    expect(koreanDay(new Date('2026-11-15T15:00:00Z'))).toBe('2026-11-16');
  });
  it('distinguishes completed first requests, continuations, failures and rejections', () => {
    expect(requestCounters('ok', true, false)).toMatchObject({
      requests: 1,
      successes: 1,
      starts: 1,
      failures: 0,
    });
    expect(requestCounters('ok', false, false).starts).toBe(0);
    expect(requestCounters('cancelled', true, false)).toMatchObject({
      cancelled: 1,
      starts: 0,
      successes: 0,
      failures: 0,
    });
    expect(requestCounters('TIMEOUT', true, false)).toMatchObject({
      failures: 1,
      starts: 0,
    });
    expect(requestCounters('RATE_LIMITED', true, true)).toMatchObject({
      rejected: 1,
      starts: 0,
      failures: 0,
    });
  });
  it('cannot store arbitrary result keys or error text', () => {
    const counters = requestCounters('private.error.$value', false, false);
    expect(counters['outcomes.UNAVAILABLE']).toBe(1);
    expect(JSON.stringify(counters)).not.toContain('private');
  });
});
