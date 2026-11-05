import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class UsageOverviewService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async todayUsage(now = new Date()): Promise<{ countedTurns: number; signedInAccounts: number; guestNetworks: number }> {
    if (!this.connection.db) throw new ServiceUnavailableException();
    const day = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const record = await this.connection.db.collection('daily_turn_limits')
      .findOne({ _id: day as never }, { projection: { counts: 1, identities: 1 } });
    const counts = record?.counts;
    if (!counts || typeof counts !== 'object' || Array.isArray(counts))
      return { countedTurns: 0, signedInAccounts: 0, guestNetworks: 0 };
    const countedTurns = Object.values(counts).reduce<number>((sum, count) =>
      typeof count === 'number' && Number.isSafeInteger(count) && count > 0
        ? sum + count : sum, 0);
    const countIdentities = (kind: 'user' | 'ip') => {
      const identities = record?.identities?.[kind];
      if (!identities || typeof identities !== 'object' || Array.isArray(identities)) return 0;
      return Object.keys(identities).filter((key) => typeof counts[key] === 'number' && counts[key] > 0).length;
    };
    return { countedTurns, signedInAccounts: countIdentities('user'), guestNetworks: countIdentities('ip') };
  }
}
