import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { DailyRequestUsage } from '../../app/usage/daily-usage';

type StoredUsage = Omit<DailyRequestUsage, 'day'> & {
  _id: string;
  firstRecordedAt: Date;
  identityExpiresAt?: Date;
  identities?: { user?: string[]; ip?: string[] };
};

@Injectable()
export class DailyUsageRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private get collection() {
    if (!this.connection.db) throw new ServiceUnavailableException();
    return this.connection.db.collection<StoredUsage>('daily_usage_metrics');
  }

  async record(
    day: string,
    counters: Record<string, number>,
    identity?: { kind: 'user' | 'ip'; hash: string },
  ) {
    const fields: Record<string, unknown> = Object.fromEntries(
      Object.entries(counters).map(([key, value]) => [
        key,
        { $add: [{ $ifNull: [`$${key}`, 0] }, value] },
      ]),
    );
    if (identity) {
      const path = `identities.${identity.kind}`;
      const count =
        identity.kind === 'user' ? 'signedInAccounts' : 'guestNetworks';
      fields[count] = {
        $add: [
          { $ifNull: [`$${count}`, 0] },
          {
            $cond: [
              { $in: [identity.hash, { $ifNull: [`$${path}`, []] }] },
              0,
              1,
            ],
          },
        ],
      };
      fields[path] = {
        $setUnion: [{ $ifNull: [`$${path}`, []] }, [identity.hash]],
      };
    }
    fields.firstRecordedAt = { $ifNull: ['$firstRecordedAt', new Date()] };
    fields.identityExpiresAt = {
      $ifNull: [
        '$identityExpiresAt',
        new Date(new Date(`${day}T00:00:00+09:00`).valueOf() + 4 * 86400000),
      ],
    };
    const update = [{ $set: fields }];
    try {
      await this.collection.updateOne({ _id: day }, update, {
        upsert: true,
        maxTimeMS: 2000,
        writeConcern: { w: 'majority' },
      });
    } catch (error) {
      // Duplicate-key creation races did not apply the increment. Other ambiguous failures must not be retried.
      if (
        !(
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 11000
        )
      )
        throw error;
      await this.collection.updateOne({ _id: day }, update, {
        maxTimeMS: 2000,
        writeConcern: { w: 'majority' },
      });
    }
  }

  async removeExpiredIdentities(now = new Date()) {
    await this.collection.updateMany(
      { identityExpiresAt: { $lt: now } },
      { $unset: { identities: '', identityExpiresAt: '' } },
      { maxTimeMS: 2000 },
    );
  }

  async firstRecordedAt() {
    return this.collection.findOne(
      {},
      { sort: { _id: 1 }, projection: { firstRecordedAt: 1 }, maxTimeMS: 2000 },
    );
  }

  async recent(from: string, to: string) {
    return this.collection
      .find(
        { _id: { $gte: from, $lte: to } },
        {
          projection: { identities: 0, identityExpiresAt: 0 },
          maxTimeMS: 2000,
        },
      )
      .sort({ _id: -1 })
      .toArray();
  }
}
