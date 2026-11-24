import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { createConnection, type Connection } from 'mongoose';
import { JourneyRepository } from './journey.repository';

const suite = process.env.TO_HIGH_TEST_MONGOD ? describe : describe.skip;
suite('journey persistence with isolated MongoDB', () => {
  let directory: string,
    child: ChildProcess,
    connection: Connection,
    repository: JourneyRepository;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'wiro-journey-'));
    const port = await new Promise<number>((resolve) => {
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        const value = typeof address === 'object' && address ? address.port : 0;
        server.close(() => resolve(value));
      });
    });
    child = spawn(
      process.env.TO_HIGH_TEST_MONGOD!,
      [
        '--dbpath',
        directory,
        '--bind_ip',
        '127.0.0.1',
        '--port',
        String(port),
        '--quiet',
      ],
      { env: { PATH: process.env.PATH }, stdio: 'ignore' },
    );
    connection = await createConnection(
      `mongodb://127.0.0.1:${port}/journey_test`,
      { serverSelectionTimeoutMS: 15000 },
    ).asPromise();
    repository = new JourneyRepository(connection);
    await repository.onModuleInit();
    const indexes = await connection
      .db!.collection('journey_metrics')
      .indexes();
    expect(indexes.map((index) => index.name).sort()).toEqual([
      '_id_',
      'expiresAt_1',
    ]);
  }, 20000);
  afterAll(async () => {
    await connection?.close();
    if (child && child.exitCode === null) {
      const stopped = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGTERM');
      await stopped;
    }
    if (directory) await rm(directory, { recursive: true, force: true });
  });
  it('deduplicates concurrent events and success retries, while locking cohort and creation day', async () => {
    const context = {
      id: 'a'.repeat(32),
      source: 'practicket',
      entry: 'lobby_ticketing',
    } as const;
    const now = new Date('2026-11-23T14:59:00Z');
    await Promise.all(
      Array.from({ length: 12 }, () =>
        repository.record(
          'hashed-flow',
          context,
          [
            'landing',
            'selected',
            'character_selected',
            'first_message',
            'first_response',
          ],
          'turn-1',
          now,
        ),
      ),
    );
    await repository.record(
      'hashed-flow',
      context,
      ['first_response'],
      'turn-2',
      new Date('2026-11-23T15:01:00Z'),
    );
    let rows = await repository.recent(
      new Date('2026-11-22'),
      new Date('2026-11-25'),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        _id: {
          day: '2026-11-23',
          source: 'practicket',
          entry: 'lobby_ticketing',
        },
        selected: 1,
        first_response: 1,
        continued: 0,
      }),
    ]);
    await repository.record(
      'hashed-flow',
      context,
      ['first_response'],
      'turn-3',
      now,
    );
    await repository.record(
      'hashed-flow',
      { ...context, source: 'other', entry: 'ad_ticketing' },
      ['selected'],
      'turn-4',
      now,
    );
    rows = await repository.recent(
      new Date('2026-11-22'),
      new Date('2026-11-25'),
    );
    expect(rows[0].continued).toBe(1);
    const stored = await connection
      .db!.collection('journey_metrics')
      .findOne({ _id: 'hashed-flow' as never });
    expect(stored?.successfulTurns).toHaveLength(3);
    expect(stored?.expiresAt).toEqual(new Date(now.valueOf() + 31 * 86400000));
    expect(JSON.stringify(stored)).not.toContain(context.id);
    expect(await repository.firstRecordedAt()).toEqual({ startedAt: now });
  });
  it('allows landing and selection to arrive out of order without erasing entry', async () => {
    const context = {
      id: 'b'.repeat(32),
      source: 'practicket',
      entry: 'ad_ticketing',
    } as const;
    const now = new Date('2026-11-24T01:00:00Z');
    await repository.record(
      'out-of-order',
      context,
      ['selected'],
      undefined,
      now,
    );
    await repository.record(
      'out-of-order',
      { ...context, entry: 'unselected' },
      ['landing'],
      undefined,
      now,
    );
    const rows = await repository.recent(
      new Date('2026-11-23T15:00:00Z'),
      new Date('2026-11-24T15:00:00Z'),
    );
    expect(rows[0]).toEqual(
      expect.objectContaining({
        _id: { day: '2026-11-24', source: 'practicket', entry: 'ad_ticketing' },
        landing: 1,
        selected: 1,
      }),
    );
  });
});

describe('journey storage availability', () => {
  it('keeps startup available but disables metrics if retention indexes cannot be installed', async () => {
    const repository = new JourneyRepository({
      db: {
        collection: () => ({
          createIndex: () =>
            Promise.reject(new Error('synthetic index failure')),
        }),
      },
    } as unknown as Connection);
    await expect(repository.onModuleInit()).resolves.toBeUndefined();
    await expect(repository.recent(new Date(), new Date())).rejects.toThrow();
    await expect(
      repository.record('synthetic', { source: 'other', entry: 'levi' }, [
        'selected',
      ]),
    ).rejects.toThrow();
  });
});
