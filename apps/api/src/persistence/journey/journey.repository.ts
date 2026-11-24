import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { JourneyContext, JourneyStage } from '../../app/journey/journey';

type StoredJourney = {
  _id: string;
  startedAt: Date;
  expiresAt: Date;
  source: JourneyContext['source'];
  entry: JourneyContext['entry'];
  stages: Partial<Record<JourneyStage, boolean>>;
  successfulTurns: string[];
};
@Injectable()
export class JourneyRepository implements OnModuleInit {
  private ready = false;
  private readonly logger = new Logger(JourneyRepository.name);
  constructor(@InjectConnection() private readonly connection: Connection) {}
  private get collection() {
    if (!this.connection.db) throw new ServiceUnavailableException();
    return this.connection.db.collection<StoredJourney>('journey_metrics');
  }
  async onModuleInit() {
    try {
      await this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      );
      await this.collection.createIndex({ startedAt: 1 });
      this.ready = true;
    } catch {
      this.logger.warn('Journey indexes unavailable');
    }
  }
  async record(
    id: string,
    context: Pick<JourneyContext, 'source' | 'entry'>,
    stages: JourneyStage[],
    turnId?: string,
    now = new Date(),
  ) {
    if (!this.ready) throw new ServiceUnavailableException();
    const compatible = {
      $and: [
        { $eq: ['$source', context.source] },
        {
          $or: [
            { $eq: ['$entry', context.entry] },
            { $eq: [context.entry, 'unselected'] },
          ],
        },
      ],
    };
    const update = [
      {
        $set: {
          startedAt: { $ifNull: ['$startedAt', now] },
          expiresAt: {
            $ifNull: ['$expiresAt', new Date(now.valueOf() + 31 * 86400000)],
          },
          source: { $ifNull: ['$source', context.source] },
          entry: {
            $cond: [
              {
                $and: [
                  {
                    $eq: [
                      { $ifNull: ['$source', context.source] },
                      context.source,
                    ],
                  },
                  {
                    $eq: [{ $ifNull: ['$entry', 'unselected'] }, 'unselected'],
                  },
                ],
              },
              context.entry,
              '$entry',
            ],
          },
        },
      },
      {
        $set: {
          ...Object.fromEntries(
            stages.map((stage) => [
              `stages.${stage}`,
              { $or: [{ $ifNull: [`$stages.${stage}`, false] }, compatible] },
            ]),
          ),
          successfulTurns: {
            $cond: [
              compatible,
              {
                $slice: [
                  {
                    $setUnion: [
                      { $ifNull: ['$successfulTurns', []] },
                      turnId ? [turnId] : [],
                    ],
                  },
                  3,
                ],
              },
              { $ifNull: ['$successfulTurns', []] },
            ],
          },
        },
      },
      {
        $set: {
          'stages.continued': { $gte: [{ $size: '$successfulTurns' }, 3] },
        },
      },
    ];
    try {
      await this.collection.updateOne({ _id: id }, update, {
        upsert: true,
        maxTimeMS: 2000,
      });
    } catch (error: unknown) {
      if (
        !(
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 11000
        )
      )
        throw error;
      await this.collection.updateOne({ _id: id }, update, { maxTimeMS: 2000 });
    }
    await this.connection
      .db!.collection<{
        _id: string;
        firstRecordedAt: Date;
      }>('journey_metrics_meta')
      .updateOne(
        { _id: 'collection-start' },
        { $min: { firstRecordedAt: now } },
        { upsert: true, maxTimeMS: 2000 },
      );
  }
  async recent(from: Date, to: Date) {
    if (!this.ready) throw new ServiceUnavailableException();
    return this.collection
      .aggregate<
        {
          _id: {
            day: string;
            source: JourneyContext['source'];
            entry: JourneyContext['entry'];
          };
        } & Record<JourneyStage, number>
      >(
        [
          { $match: { startedAt: { $gte: from, $lt: to } } },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    date: '$startedAt',
                    format: '%Y-%m-%d',
                    timezone: 'Asia/Seoul',
                  },
                },
                source: '$source',
                entry: '$entry',
              },
              ...Object.fromEntries(
                [
                  'landing',
                  'selected',
                  'character_selected',
                  'first_message',
                  'first_response',
                  'continued',
                ].map((stage) => [
                  stage,
                  { $sum: { $cond: [`$stages.${stage}`, 1, 0] } },
                ]),
              ),
            },
          },
          { $sort: { '_id.day': -1 } },
        ],
        { maxTimeMS: 2000 },
      )
      .toArray();
  }
  async firstRecordedAt() {
    if (!this.ready || !this.connection.db)
      throw new ServiceUnavailableException();
    const metadata = await this.connection.db
      .collection<{
        _id: string;
        firstRecordedAt: Date;
      }>('journey_metrics_meta')
      .findOne({ _id: 'collection-start' }, { maxTimeMS: 2000 });
    return metadata ? { startedAt: metadata.firstRecordedAt } : null;
  }
}
