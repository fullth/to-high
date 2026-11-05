import type { Connection } from 'mongoose';
import { UsageOverviewService } from './usage-overview.service';

describe('usage overview', () => {
  it('returns only the sum for the Korean calendar day', async () => {
    const findOne = jest.fn().mockResolvedValue({ counts: { first: 3, second: 2, rejected: 0 }, identities: { user: { first: true }, ip: { second: true, rejected: true } } });
    const service = new UsageOverviewService({ db: { collection: () => ({ findOne }) } } as unknown as Connection);
    await expect(service.todayUsage(new Date('2026-11-04T15:00:00Z'))).resolves.toEqual({ countedTurns: 5, signedInAccounts: 1, guestNetworks: 1 });
    expect(findOne).toHaveBeenCalledWith({ _id: '2026-11-05' }, { projection: { counts: 1, identities: 1 } });
  });

  it('returns zero when no requests were counted', async () => {
    const service = new UsageOverviewService({ db: { collection: () => ({ findOne: async () => null }) } } as unknown as Connection);
    await expect(service.todayUsage()).resolves.toEqual({ countedTurns: 0, signedInAccounts: 0, guestNetworks: 0 });
  });
});
